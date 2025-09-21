// @ts-ignore
import Parser from 'tree-sitter';

/**
 * 深度优先遍历右值表达式，识别主运算符
 * @param node Tree-sitter 语法树节点
 * @param sourceCode 源代码字符串
 * @returns 操作类型（'mul' | 'add' | 'sub'）或 null
 */
export function getRhsOperation(node: any, sourceCode: string): 'mul' | 'add' | 'sub' | null {
    if (node.type === 'binary_expression') {
        // @ts-ignore
        const operatorNode = (node as any).childForFieldName('operator');
        if (operatorNode) {
            const operator = sourceCode.slice(operatorNode.startIndex, operatorNode.endIndex);
            return ({ '*': 'mul', '+': 'add', '-': 'sub' } as const)[operator] || null;
        }
    }
    for (let i = 0; i < node.namedChildCount; i++) {
        const child = node.namedChild(i);
        if (child) {
            const result = getRhsOperation(child, sourceCode);
            if (result) return result;
        }
    }
    return null;
} 