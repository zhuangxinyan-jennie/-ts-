import Parser from 'tree-sitter';

/**
 * 自动检测顶层函数（最外层调用者）
 * @param rootNode AST 根节点
 * @param sourceCode C 源码字符串
 * @returns [顶层函数名, 调用关系映射]
 */
export function detectTopFunctionViaCallGraph(rootNode: Parser.SyntaxNode, sourceCode: string): [string | null, Record<string, Set<string>>] {
    const calls: Record<string, Set<string>> = {};
    const definedFunctions = new Set<string>();

    function extractIdentifierFromDeclarator(declaratorNode: Parser.SyntaxNode | null): string | null {
        if (!declaratorNode) return null;
        const stack = [declaratorNode];
        while (stack.length) {
            const node = stack.pop()!;
            if (node.type === 'identifier') {
                return sourceCode.slice(node.startIndex, node.endIndex);
            }
            stack.push(...node.namedChildren.reverse());
        }
        return null;
    }

    function traverse(n: Parser.SyntaxNode | null, currentFunc: string | null = null) {
        if (!n) return;
        if (n.type === 'function_definition') {
            let declarator = null;
            if (n && typeof (n as any).childForFieldName === 'function') {
                // @ts-ignore
                declarator = (n as any).childForFieldName('declarator');
            }
            const funcName = extractIdentifierFromDeclarator(declarator);
            if (funcName) {
                currentFunc = funcName;
                definedFunctions.add(currentFunc);
                if (!calls[currentFunc]) calls[currentFunc] = new Set();
            }
        } else if (n.type === 'call_expression') {
            let funcNode = null;
            if (n && typeof (n as any).childForFieldName === 'function') {
                // @ts-ignore
                funcNode = (n as any).childForFieldName('function');
            }
            if (funcNode && funcNode.type === 'identifier') {
                const callee = sourceCode.slice(funcNode.startIndex, funcNode.endIndex);
                if (currentFunc) {
                    if (!calls[currentFunc]) calls[currentFunc] = new Set();
                    calls[currentFunc].add(callee);
                }
            }
        }
        n.namedChildren.forEach(child => traverse(child, currentFunc));
    }
    traverse(rootNode);

    const allCallees = new Set<string>();
    Object.values(calls).forEach(callees => {
        callees.forEach(callee => allCallees.add(callee));
    });
    const topFuncs = Object.keys(calls).filter(func => !allCallees.has(func));

    let topFunc: string | null = null;
    if (topFuncs.includes('main')) {
        topFunc = 'main';
    } else if (topFuncs.length > 0) {
        topFunc = topFuncs.sort()[0];
    }
    return [topFunc, calls];
} 