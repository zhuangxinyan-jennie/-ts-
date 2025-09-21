import * as fs from 'fs';
import * as path from 'path';

/**
 * 解析所有关联头文件中的宏定义（支持多层嵌套）
 * @param cFilePath C 文件路径
 * @param sourceCode C 源码字符串
 * @returns 宏定义映射表
 */
export function parseHeaderMacros(cFilePath: string, sourceCode: string): Record<string, string> {
    const macroMap: Record<string, string> = {};
    const includePattern = /#include\s+["<](.+?)[">]/g;
    const definePattern = /#define\s+(\w+)(?:\([^)]*\))?\s+(.*?)(?=\n#|$)/gs;

    // 解析当前源码中的宏
    for (const match of sourceCode.matchAll(definePattern)) {
        const macro = match[1];
        const value = match[2];
        macroMap[macro] = value;
    }

    // 递归解析头文件
    function parseFile(filePath: string, visited: Set<string>) {
        if (visited.has(filePath)) return;
        visited.add(filePath);
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            for (const match of content.matchAll(/#define\s+(\w+)(?:\([^)]*\))?\s+(.+)$/gm)) {
                const macro = match[1];
                const value = match[2];
                macroMap[macro] = value;
            }
            for (const match of content.matchAll(includePattern)) {
                const headerPath = path.join(path.dirname(filePath), match[1]);
                if (fs.existsSync(headerPath)) {
                    parseFile(headerPath, visited);
                }
            }
        } catch (e) {
            // 文件不存在，忽略
        }
    }

    // 初始解析当前 C 文件所在目录的头文件
    const baseDir = path.dirname(cFilePath);
    const initialHeaders = Array.from(sourceCode.matchAll(includePattern)).map(m => m[1]);
    const visited = new Set<string>();
    for (const header of initialHeaders) {
        const headerPath = path.join(baseDir, header);
        if (fs.existsSync(headerPath)) {
            parseFile(headerPath, visited);
        }
    }
    return macroMap;
} 