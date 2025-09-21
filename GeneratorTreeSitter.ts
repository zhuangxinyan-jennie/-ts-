import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { interList } from './interList';
import { funcList } from './funcList';
import { findTopFunc } from './findTopFunc';
import { findArrList } from './findArrList';
import { getParser } from './getParser';
import { generateCallGraphImage } from './generateCallGraphImage';
import { parseHeaderMacros } from './parseHeaderMacros';
import { extractLoops } from './extractLoops';
import { extractFunctionCalls } from './extractFunctionCalls';
import { generateDictOp } from './generateDictOp';
import { collectAssignments } from './collectAssignments';
import { collectVariableDeclarations } from './collectVariableDeclarations';
import Parser from 'tree-sitter';

function findIdentifierDeep(node: Parser.SyntaxNode, sourceCode: string): string | null {
    if (node.type === 'identifier') {
        return sourceCode.slice(node.startIndex, node.endIndex);
    }
    for (const child of node.namedChildren) {
        const result = findIdentifierDeep(child, sourceCode);
        if (result) return result;
    }
    return null;
}

/**
 * 构造 YAML 配置对象
 */
function generateConfigYaml(
    topFunc: string,
    funcCalls: string[],
    loops: any[],
    variables: Record<string, string>,
    assignments: [string, string, string | null][],
    tree: any,
    sourceCode: string
) {
    const paramList = interList(sourceCode);
    funcCalls = funcList(sourceCode);
    const topFuncName = topFunc;
    const arrList = findArrList(sourceCode);
    const config: any = {
        top: [topFuncName],
        funcList: funcCalls,
        loopList: {},
        dictOp: {
            int: {}, float: [], double: [], half: []
        },
        interList: paramList.map(i => `${topFuncName} ${i}`),
        arrList: arrList.map(i => `${topFuncName} ${i}`)
    };
    // 构建 loopList
    function collectLoopGroups(loop: any, groupName: string) {
        const labelList: string[] = [];
        function collectLabels(loopNode: any) {
            const fullLabel = `${topFuncName}/${loopNode.label}`;
            labelList.push(fullLabel);
            (loopNode.innerLoops || []).forEach(collectLabels);
        }
        collectLabels(loop);
        config.loopList[groupName] = {
            level: labelList,
            unroll: labelList,
            pipeline: [labelList[labelList.length - 1]],
            flatten: []
        };
    }
    loops.forEach((loop, idx) => {
        collectLoopGroups(loop, `group${idx + 1}`);
    });
    config.dictOp = generateDictOp(topFuncName, variables, assignments);
    return config;
}

/**
 * 主处理逻辑
 */
export function processFile(cFile: string, drawGraph = false): any {
    const filename = path.basename(cFile);
    const filePrefix = path.parse(filename).name;
    const sourceCode = fs.readFileSync(cFile, 'utf-8');
    const macroMap = parseHeaderMacros(cFile, sourceCode);
    console.log(`[DEBUG] 宏定义映射表:`, macroMap);
    const parser = getParser();
    const tree = parser.parse(sourceCode);
    const rootNode = tree.rootNode;
    // 只用 findTopFunc 查找顶层函数
    const topFuncArr = findTopFunc(sourceCode);
    let topFunc = topFuncArr[0] || (filePrefix + '_main');
    if (!topFunc) {
        console.log('[DEBUG] fallback topFunc to:', topFunc);
    }
    // 查找主函数节点
    let mainFuncNode: Parser.SyntaxNode | null = null;
    function findMainFunction(node: Parser.SyntaxNode) {
        if (node.type === 'function_definition') {
            // 递归 function_definition 的所有子节点
            const identifier = findIdentifierDeep(node, sourceCode);
            console.log('[DEBUG] function_definition found identifier:', identifier);
            console.log('[DEBUG] compare identifier:', JSON.stringify(identifier), 'topFunc:', JSON.stringify(topFunc));
            console.log('[DEBUG] identifier length:', identifier ? identifier.length : 'null', 'topFunc length:', topFunc ? topFunc.length : 'null');
            if (identifier && topFunc && identifier.trim() === topFunc.trim()) {
                mainFuncNode = node;
            }
        }
        node.namedChildren.forEach(findMainFunction);
    }
    findMainFunction(rootNode);
    if (
        mainFuncNode &&
        typeof mainFuncNode === 'object' &&
        mainFuncNode !== null &&
        typeof (mainFuncNode as any).startIndex === 'number' &&
        typeof (mainFuncNode as any).endIndex === 'number' &&
        typeof (mainFuncNode as any).type === 'string'
    ) {
        console.log('[DEBUG] mainFuncNode:', (mainFuncNode as any).type);
        console.log(
            '[DEBUG] mainFuncNode text:',
            sourceCode.slice(
                (mainFuncNode as any).startIndex,
                (mainFuncNode as any).endIndex
            ).slice(0, 200)
        );
    } else {
        console.log('[DEBUG] mainFuncNode is null or invalid:', mainFuncNode === null || mainFuncNode === undefined);
    }
    let loops: any[] = [];
    if (mainFuncNode) {
        loops = extractLoops(mainFuncNode, sourceCode);
    }
    console.log('[DEBUG] loops:', JSON.stringify(loops, null, 2));
    const funcCalls = extractFunctionCalls(rootNode, sourceCode, filePrefix);
    const variables = collectVariableDeclarations(mainFuncNode!, sourceCode, macroMap);
    const assignments = collectAssignments(mainFuncNode!, sourceCode, loops);
    console.log('[DEBUG] assignments:', JSON.stringify(assignments, null, 2));
    return generateConfigYaml(topFunc, funcCalls, loops, variables, assignments, tree, sourceCode);
}

/**
 * YAML 文件生成主入口
 */
export function generateYamlFromCFile(cFile: string, drawGraph = false, output?: string) {
    const config = processFile(cFile, drawGraph);
    let yamlStr = yaml.dump(config, { indent: 4, sortKeys: false });
    // 美化 YAML 缩进
    const lines = yamlStr.split('\n');
    const newLines: string[] = [];
    let currentKey: string | null = null;
    for (const line of lines) {
        const stripped = line.trim();
        if (stripped.endsWith(':')) {
            currentKey = stripped.slice(0, -1);
            newLines.push(line);
        } else if (stripped.startsWith('- ')) {
            if ([
                'top', 'funcList', 'level', 'unroll', 'pipeline', 'flatten',
                'float', 'double', 'half', 'arrList', 'interList'
            ].includes(currentKey!)) {
                newLines.push('    ' + line);
            } else {
                newLines.push(line);
            }
        } else {
            newLines.push(line);
            if (line.includes(':')) {
                currentKey = line.split(':')[0].trim();
            }
        }
    }
    yamlStr = newLines.join('\n');
    console.log('# === 生成的配置文件 (YAML 格式) ===');
    console.log(yamlStr);
    const outPath = output || path.parse(cFile).name + '.yaml';
    fs.writeFileSync(outPath, yamlStr, 'utf-8');
    console.log(`YAML 配置文件已保存到: ${outPath}`);
} 