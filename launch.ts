import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { processFile as addPredefine } from './AddPredefine';
import { removeCCommentsFromFile } from './DelAnnotation';
import { generateYamlFromCFile } from './GeneratorTreeSitter';

/**
 * 主入口：预处理并分析 C 代码，输出 YAML 配置和调用图
 * @param source 原始 C 源码路径
 * @param expandMacros 是否展开类型宏
 * @param drawCallgraph 是否绘制调用图
 * @param output YAML 输出路径（可选）
 */
export function main({
    source,
    expandMacros = false,
    drawCallgraph = false,
    output
}: {
    source: string;
    expandMacros?: boolean;
    drawCallgraph?: boolean;
    output?: string;
}) {
    // 1. 预处理：变量初始化
    const tmp1 = path.join(os.tmpdir(), `predefine_${Date.now()}.c`);
    const tmp2 = path.join(os.tmpdir(), `no_comment_${Date.now()}.c`);
    fs.writeFileSync(tmp1, addPredefine(source, expandMacros), 'utf-8');
    // 2. 删除注释
    removeCCommentsFromFile(tmp1, tmp2);
    // 3. 生成 YAML 和调用图
    generateYamlFromCFile(tmp2, drawCallgraph, output);
    // 清理临时文件
    fs.unlinkSync(tmp1);
    fs.unlinkSync(tmp2);
    console.log('[✓] 所有处理完成');
}

// 命令行入口
if (require.main === module) {
    const argv = process.argv.slice(2);
    const args: any = {};
    let i = 0;
    while (i < argv.length) {
        if (argv[i] === '--expand-macros') {
            args.expandMacros = true;
            i++;
        } else if (argv[i] === '--draw-callgraph') {
            args.drawCallgraph = true;
            i++;
        } else if (argv[i] === '-o' || argv[i] === '--output') {
            args.output = argv[i + 1];
            i += 2;
        } else if (!args.source) {
            args.source = argv[i];
            i++;
        } else {
            i++;
        }
    }
    if (!args.source) {
        console.error('用法: node launch.js <source.c> [--expand-macros] [--draw-callgraph] [-o output.yaml]');
        process.exit(1);
    }
    main(args);
} 