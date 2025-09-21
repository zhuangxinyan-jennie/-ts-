import { getParser } from './getParser';

/**
 * 提取顶层父函数中被调用的本地函数名
 * @param code C 源码字符串
 * @returns 被调用的本地函数名数组
 */
export function funcList(code: string): string[] {
    const parser = getParser();
    const tree = parser.parse(code);

    const nameAllFunc: string[] = [];
    const nameCalledAllFunc: string[] = [];
    const topFunc: string[] = [];
    const funclistFinal: string[] = [];

    // 1. 找出所有函数名
    tree.rootNode.children.forEach((node: any) => {
        if (node.type === 'function_definition') {
            const declarator = node.namedChildren.find((child: any) => child.type === 'function_declarator');
            const idNode = declarator?.namedChildren.find((child: any) => child.type === 'identifier');
            if (idNode) nameAllFunc.push(idNode.text);
        }
    });

    // 2. 找出所有被调用的函数名
    tree.rootNode.descendantsOfType('call_expression').forEach((callNode: any) => {
        const idNode = callNode.namedChildren[0];
        if (idNode) nameCalledAllFunc.push(idNode.text);
    });

    // 3. 找出顶层父函数
    nameAllFunc.forEach(name => {
        if (!nameCalledAllFunc.includes(name)) topFunc.push(name);
    });

    // 4. 查找顶层父函数中被调用的本地函数
    tree.rootNode.children.forEach((node: any) => {
        if (node.type === 'function_definition') {
            const declarator = node.namedChildren.find((child: any) => child.type === 'function_declarator');
            const idNode = declarator?.namedChildren.find((child: any) => child.type === 'identifier');
            if (idNode && topFunc.includes(idNode.text)) {
                node.descendantsOfType('call_expression').forEach((callNode: any) => {
                    const calledFunc = callNode.namedChildren[0];
                    if (calledFunc && nameAllFunc.includes(calledFunc.text)) {
                        funclistFinal.push(calledFunc.text);
                    }
                });
            }
        }
    });

    // 去重并排序
    return Array.from(new Set(funclistFinal)).sort();
} 