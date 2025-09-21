import * as fs from 'fs';

/**
 * 移除 C 代码中的注释（支持单行和多行注释）
 * @param code C 代码字符串
 * @returns 移除注释后的代码
 */
export function removeCComments(code: string): string {
    // 移除单行注释
    code = code.replace(/\/\/.*?\n/g, '\n');
    // 移除多行注释
    code = code.replace(/\/\*[\s\S]*?\*\//g, '');
    return code;
}

/**
 * 从文件移除 C 注释
 */
export function removeCCommentsFromFile(inputPath: string, outputPath: string) {
    const code = fs.readFileSync(inputPath, 'utf-8');
    const cleaned = removeCComments(code);
    fs.writeFileSync(outputPath, cleaned, 'utf-8');
    console.log(`Cleaned code saved to ${outputPath}`);
}

// 命令行入口
if (require.main === module) {
    const argv = process.argv.slice(2);
    if (argv.length < 2) {
        console.error('用法: node DelAnnotation.js <输入文件> <输出文件>');
        process.exit(1);
    }
    removeCCommentsFromFile(argv[0], argv[1]);
} 