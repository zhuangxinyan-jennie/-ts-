import { getParser } from './getParser';

/**
 * 提取顶层父函数中声明的数组变量名
 * @param code C 源码字符串
 * @returns 数组变量名数组
 */
export function findArrList(code: string): string[] {
    const parser = getParser();
    const tree = parser.parse(code);

    const nameAllFunc: string[] = [];
    const nameCalledAllFunc: string[] = [];
    const topFunc: string[] = [];
    const arrList: string[] = [];

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

    // 2. 找出顶层父函数
    nameAllFunc.forEach(name => {
        if (!nameCalledAllFunc.includes(name)) topFunc.push(name);
    });

    // 3. 在顶层父函数中找数组声明
    tree.rootNode.children.forEach(node => {
        if (node.type === 'function_definition') {
            const declarator = node.namedChildren.find(child => child.type === 'function_declarator');
            const idNode = declarator?.namedChildren.find(child => child.type === 'identifier');
            if (idNode && topFunc.includes(idNode.text)) {
                node.descendantsOfType('declaration').forEach(decl => {
                    decl.namedChildren.forEach(initDecl => {
                        if (initDecl.type === 'init_declarator') {
                            const firstChild = initDecl.namedChildren[0];
                            if (firstChild && firstChild.type === 'array_declarator') {
                                const arrName = firstChild.namedChildren[0];
                                if (arrName) arrList.push(arrName.text);
                            }
                        }
                    });
                });
            }
        }
    });

    return arrList;
} 