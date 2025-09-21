// @ts-ignore
import Parser from 'tree-sitter';
// import { getRhsOperation } from './getRhsOperation'; // 需要你实现右值操作类型推断
type SyntaxNode = any;

type SyntaxNodeWithChild = {
    childForFieldName?: (name: string) => SyntaxNodeWithChild | null;
    namedChildren: SyntaxNodeWithChild[];
    type: string;
    startIndex: number;
    endIndex: number;
    // 其他你用到的属性可以继续补充
};

/**
 * 收集赋值操作（含循环标签）
 * @param mainFuncNode AST 节点（主函数）
 * @param sourceCode C 源码字符串
 * @param loops 循环信息数组
 * @returns 赋值操作元组数组 [变量名, 操作类型, 循环标签]
 */
export function collectAssignments(mainFuncNode: SyntaxNodeWithChild, sourceCode: string, loops: any[]): [string, string, string | null][] {
    const assignments: [string, string, string | null][] = [];

    // 递归收集所有循环（含嵌套）
    const allLoops: any[] = [];
    function collectLoops(loopList: any[]) {
        for (const loop of loopList) {
            allLoops.push(loop);
            collectLoops(loop.innerLoops || []);
        }
    }
    collectLoops(loops);
    allLoops.sort((a, b) => b.startIndex - a.startIndex || a.endIndex - b.endIndex); // 内层循环优先

    function traverse(n: SyntaxNodeWithChild | null) {
        if (!n) return;
        // 调试输出每个节点类型和源码片段
        console.log('[DEBUG] node type:', n.type, sourceCode.slice(n.startIndex, n.endIndex));
        // 处理赋值表达式
        if (n.type === 'assignment_expression') {
            const left = n.childForFieldName ? n.childForFieldName('left') : null;
            const operator = n.childForFieldName ? n.childForFieldName('operator') : null;
            const right = n.childForFieldName ? n.childForFieldName('right') : null;
            if (!left || !operator || !right) return;
            const varName = left.type === 'identifier' ? sourceCode.slice(left.startIndex, left.endIndex) : null;
            const op = sourceCode.slice(operator.startIndex, operator.endIndex);
            let opType = op === '=' ? 'assign' : ({'+=': 'add', '-=': 'sub', '*=': 'mul'} as any)[op];
            if (opType === 'assign' || !opType) return;
            // 定位循环标签
            const currentIndex = n.startIndex;
            const selectedLoop = allLoops.find(loop => loop.startIndex <= currentIndex && currentIndex <= loop.endIndex);
            const loopLabel = selectedLoop ? selectedLoop.label : null;
            if (varName) {
                assignments.push([varName, opType, loopLabel]);
            }
        }
        // 处理自增/自减操作
        else if (n.type === 'update_expression') {
            const operator = sourceCode.slice(n.startIndex, n.endIndex);
            // 直接找第一个 identifier 子节点
            const operand = n.namedChildren.find(child => child.type === 'identifier');
            console.log('[DEBUG] update_expression:', operator, operand ? operand.type : 'null');
            if (operand && operand.type === 'identifier') {
                const varName = sourceCode.slice(operand.startIndex, operand.endIndex);
                const opType = operator.includes('++') ? 'add' : 'sub';
                const currentIndex = n.startIndex;
                const selectedLoop = allLoops.find(loop => loop.startIndex <= currentIndex && currentIndex <= loop.endIndex);
                const loopLabel = selectedLoop ? selectedLoop.label : null;
                if (varName) {
                    assignments.push([varName, opType, loopLabel]);
                    console.log('[DEBUG] assignments push:', varName, opType, loopLabel);
                }
            }
        }
        // 处理自增/自减操作（unary_expression 形式，for头部常见）
        else if (n.type === 'unary_expression') {
            const text = sourceCode.slice(n.startIndex, n.endIndex);
            let opType: string | null = null;
            if (text.includes('++')) opType = 'add';
            else if (text.includes('--')) opType = 'sub';
            let varName: string | null = null;
            if (n.childForFieldName) {
                const arg = n.childForFieldName('argument');
                if (arg && arg.type === 'identifier') {
                    varName = sourceCode.slice(arg.startIndex, arg.endIndex);
                }
            }
            if (opType && varName) {
                const currentIndex = n.startIndex;
                const selectedLoop = allLoops.find(loop => loop.startIndex <= currentIndex && currentIndex <= loop.endIndex);
                const loopLabel = selectedLoop ? selectedLoop.label : null;
                assignments.push([varName, opType, loopLabel]);
            }
        }
        // 递归所有 namedChildren
        n.namedChildren.forEach(traverse);
        // 递归 for 语句的各字段，确保 for 头部的 i++/i-- 能被收集到
        if (n.type === 'for_statement' && typeof n.childForFieldName === 'function') {
            for (const field of ['init', 'condition', 'update', 'body']) {
                const child = n.childForFieldName(field);
                if (child) {
                    console.log('[DEBUG] for', field, 'type:', child.type, sourceCode.slice(child.startIndex, child.endIndex));
                    traverse(child);
                }
            }
        }
    }
    traverse(mainFuncNode);
    return assignments;
} 