import { getParser } from './getParser';

/**
 * 提取所有顶层父函数名，并打印所有被调用的函数和主函数
 * @param code C 源码字符串
 * @returns 顶层父函数名数组
 */
export function findTopFunc(code: string): string[] {
    const parser = getParser();
    const tree = parser.parse(code);

    const nameAllFunc: string[] = [];
    const nameCalledAllFunc: string[] = [];
    const topFunc: string[] = [];

    // 1. 找出所有函数名和被调用函数名
    tree.rootNode.children.forEach(node => {
        if (node.type === 'function_definition') {
            const declarator = node.namedChildren.find(child => child.type === 'function_declarator');
            const idNode = declarator?.namedChildren.find(child => child.type === 'identifier');
            if (idNode) nameAllFunc.push(idNode.text);

            node.descendantsOfType('call_expression').forEach(callNode => {
                const idNode = callNode.namedChildren[0];
                if (idNode) nameCalledAllFunc.push(idNode.text);
            });
        }
    });

    // 打印所有被调用的函数名
    console.log('[DEBUG] 所有被调用的函数名:', nameCalledAllFunc);

    // 2. 找出顶层父函数
    nameAllFunc.forEach(name => {
        if (!nameCalledAllFunc.includes(name)) topFunc.push(name);
    });

    // 打印所有顶层主函数名
    console.log('[DEBUG] 顶层主函数名:', topFunc);

    return topFunc;
}