import Parser from 'tree-sitter';
// @ts-ignore
import C from 'tree-sitter-c';

/**
 * 获取 C 语言 Tree-sitter 解析器
 * @returns 配置好 C 语法的 Parser 实例
 */

console.log('C', C);
export function getParser() {
    const parser = new Parser();
    parser.setLanguage(C as any);
    return parser;
} 