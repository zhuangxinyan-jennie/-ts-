import Parser from 'tree-sitter';
// @ts-ignore
import C from 'tree-sitter-c';
// import { parseHeaderMacros } from './parseHeaderMacros'; // 需要你实现宏解析

/**
 * 提取指定前缀的函数调用
 * @param node AST 节点（一般为 rootNode）
 * @param sourceCode C 源码字符串
 * @param filePrefix 目标函数名前缀
 * @returns 匹配的函数名数组
 */
export function extractFunctionCalls(node: Parser.SyntaxNode, sourceCode: string, filePrefix = 'aes'): string[] {
    const targetPrefix = filePrefix;
    const calls = new Set<string>();

    // const macroMap = parseHeaderMacros(sourceCode); // 需要你实现宏解析
    // 这里只做函数调用前缀匹配

    function traverse(n: Parser.SyntaxNode | null) {
        if (!n) return;
        if (n.type === 'call_expression') {
            // 检查函数调用
            let funcNode = null;
            if (n && typeof (n as any).childForFieldName === 'function') {
                // @ts-ignore
                funcNode = (n as any).childForFieldName('function');
            }
            if (funcNode && funcNode.type === 'identifier') {
                const funcName = sourceCode.slice(funcNode.startIndex, funcNode.endIndex);
                if (funcName.startsWith(targetPrefix)) {
                    calls.add(funcName);
                }
            }
        }
        // 递归遍历
        n.namedChildren.forEach(traverse);
    }
    traverse(node);
    return Array.from(calls).sort();
} 