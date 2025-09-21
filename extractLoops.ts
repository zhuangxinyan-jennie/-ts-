import { getParser } from './getParser';

/**
 * 提取 for 循环（带 label）
 * @param node AST 节点（一般为函数节点）
 * @param sourceCode C 源码字符串
 * @returns 循环信息数组
 */
export function extractLoops(node: any, sourceCode: string): any[] {
    // 这里 node 已经是 AST 节点，暂不需要 parser
    // 如果后续需要 parser，可用 getParser()
    const loops: any[] = [];
    let undefinedLoopN = 0;

    /**
     * 递归遍历 AST，提取 for 循环及其标签
     */
    function traverse(n: any, parentLoop: any = null, currentLabelPath: string[] = []) {
        if (!n) return;
        // 新增：处理 labeled_statement + for_statement
        if (n.type === 'labeled_statement' && n.namedChildren.length === 2 && n.namedChildren[1].type === 'for_statement') {
            const labelNode = n.namedChildren[0];
            const label = sourceCode.slice(labelNode.startIndex, labelNode.endIndex);
            // 递归 for_statement，带上 label
            traverse(n.namedChildren[1], parentLoop, [...currentLabelPath, label]);
            return;
        }
        if (n.type === 'for_statement') {
            let label: string | null = null;
            // 优先用 currentLabelPath 最后一个 label
            if (currentLabelPath.length > 0) {
                label = currentLabelPath[currentLabelPath.length - 1];
            } else {
                undefinedLoopN += 1;
                label = `loop_${undefinedLoopN}`;
            }
            const newLabelPath = [...currentLabelPath];
            const loopInfo = {
                label,
                startIndex: n.startIndex,
                endIndex: n.endIndex,
                labelPath: newLabelPath,
                innerLoops: [] as any[]
            };
            if (parentLoop) {
                parentLoop.innerLoops.push(loopInfo);
            } else {
                loops.push(loopInfo);
            }
            n.namedChildren.forEach((child: any) => traverse(child, loopInfo, newLabelPath));
        } else {
            n.namedChildren.forEach((child: any) => traverse(child, parentLoop, currentLabelPath));
        }
    }
    traverse(node);
    return loops;
} 