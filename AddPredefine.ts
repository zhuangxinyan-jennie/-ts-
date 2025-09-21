import * as fs from 'fs';
import * as path from 'path';

// 默认初始化值（根据类型）
const defaultInit: Record<string, string> = {
    int: '0', float: '0.0f', double: '0.0', char: "'\\0'", long: '0L',
    short: '0', unsigned: '0', bool: 'false', signed: '0',
    int8_t: '0', int16_t: '0', int32_t: '0', int64_t: '0',
    uint8_t: '0', uint16_t: '0', uint32_t: '0', uint64_t: '0',
    size_t: '0'
};

const macroPattern = /#define\s+(\w+)\s+([\w\d_]+)/g;
const includePattern = /#include\s+"([^"]+)"/g;

const typeKeywords = [
    'int', 'float', 'double', 'char', 'long', 'short',
    'unsigned', 'bool', 'signed', 'int8_t', 'int16_t', 'int32_t', 'int64_t',
    'uint8_t', 'uint16_t', 'uint32_t', 'uint64_t', 'size_t'
];
const typePattern = `(?:${typeKeywords.join('|')}|\\w+)`;
const declPattern = new RegExp(
    `^\\s*(${typePattern}(?:\\s+${typePattern})*)\\s+([a-zA-Z_]\\w*(?:\\s*,\\s*[a-zA-Z_]\\w*)*)\\s*;`,
    'gm'
);

/**
 * 提取宏定义
 */
function extractMacros(code: string): Record<string, string> {
    const macros: Record<string, string> = {};
    let match: RegExpExecArray | null;
    while ((match = macroPattern.exec(code)) !== null) {
        macros[match[1]] = match[2];
    }
    return macros;
}

/**
 * 提取本地 include
 */
function extractIncludes(code: string): string[] {
    const includes: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = includePattern.exec(code)) !== null) {
        includes.push(match[1]);
    }
    return includes;
}

/**
 * 替换类型宏
 */
function resolveType(declType: string, macroMap: Record<string, string>): string {
    const words = declType.split(/\s+/);
    return words.map(word => {
        while (macroMap[word]) word = macroMap[word];
        return word;
    }).join(' ');
}

/**
 * 获取默认值
 */
function getDefaultValue(declType: string): string {
    for (const key in defaultInit) {
        if (declType.split(/\s+/).includes(key)) {
            return defaultInit[key];
        }
    }
    return '0';
}

/**
 * 替换声明为初始化声明
 */
function transformDeclaration(
    declType: string,
    variables: string,
    macroMap: Record<string, string>,
    expandMacros = false
): string {
    const resolvedType = resolveType(declType, macroMap);
    const defaultVal = getDefaultValue(resolvedType);
    const varList = variables.split(',').map(v => v.trim());
    const initialized = varList.map(v => `${v} = ${defaultVal}`);
    if (expandMacros) {
        return `${resolvedType} ${initialized.join(', ')};`;
    } else {
        return `${declType} ${initialized.join(', ')};`;
    }
}

/**
 * 解析 include 文件中的宏
 */
function loadIncludedMacros(sourcePath: string, code: string): Record<string, string> {
    const rootDir = path.dirname(sourcePath);
    const allMacros: Record<string, string> = {};
    const includedFiles = extractIncludes(code);
    for (const inc of includedFiles) {
        const incPath = path.join(rootDir, inc);
        if (fs.existsSync(incPath)) {
            const incCode = fs.readFileSync(incPath, 'utf-8');
            const macros = extractMacros(incCode);
            Object.assign(allMacros, macros);
        }
    }
    return allMacros;
}

/**
 * 替换所有未初始化的变量
 */
function initializeVariables(
    code: string,
    macroMap: Record<string, string>,
    expandMacros = false
): string {
    return code.replace(declPattern, (match, declType, variables) => {
        if (variables.includes('=')) return match;
        return transformDeclaration(declType, variables, macroMap, expandMacros);
    });
}

/**
 * 主处理函数
 */
export function processFile(filePath: string, expandMacros = false): string {
    const code = fs.readFileSync(filePath, 'utf-8');
    const macroMap = { ...extractMacros(code), ...loadIncludedMacros(filePath, code) };
    return initializeVariables(code, macroMap, expandMacros);
}

/**
 * 命令行接口
 */
if (require.main === module) {
    const argv = process.argv.slice(2);
    const args: Record<string, any> = {};
    let i = 0;
    while (i < argv.length) {
        if (argv[i] === '-o' || argv[i] === '--output') {
            args.output = argv[i + 1];
            i += 2;
        } else if (argv[i] === '--expand-macros') {
            args.expandMacros = true;
            i += 1;
        } else if (!args.source) {
            args.source = argv[i];
            i += 1;
        } else {
            i += 1;
        }
    }
    if (!args.source) {
        console.error('请输入 C 文件路径');
        process.exit(1);
    }
    const result = processFile(args.source, args.expandMacros);
    if (args.output) {
        fs.writeFileSync(args.output, result, 'utf-8');
        console.log(`已写入至 ${args.output}`);
    } else {
        console.log(result);
    }
} 