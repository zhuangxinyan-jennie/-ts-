import { writeFileSync } from 'fs';
// import { create } from 'svg-captcha'; // 这里只做示例，实际应用可用 viz.js 或 graphviz-wasm

/**
 * 生成函数调用图（Graphviz DOT 格式，推荐用 viz.js 渲染为 SVG/PNG）
 * @param callMap 调用关系映射（caller -> Set<callee>）
 * @param outputFile 输出文件名（不含扩展名）
 */
export function generateCallGraphImage(callMap: Record<string, Set<string>>, outputFile = 'call_graph') {
    let dot = 'digraph FunctionCallGraph {\n';
    for (const caller in callMap) {
        dot += `  "${caller}";\n`;
        for (const callee of callMap[caller]) {
            dot += `  "${caller}" -> "${callee}";\n`;
        }
    }
    dot += '}\n';
    // 这里只保存为 .dot 文件，实际可用 viz.js 渲染为 SVG/PNG
    writeFileSync(`${outputFile}.dot`, dot, 'utf-8');
    // 可选：集成 viz.js 渲染为 SVG/PNG
    // 例如：const svg = Viz(dot, { format: 'svg' });
    console.log(`[?] 函数调用图已生成：${outputFile}.dot`);
} 