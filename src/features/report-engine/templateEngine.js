import reportCss from "../../shared/styles/reports/report.css?raw";

export function fillTemplate(template, values) {
    let html = template;

    Object.entries(values).forEach(([key, value]) => {
        const token = `{{${key}}}`;

        html = html.replaceAll(
            token,
            value ?? ""
        );
    });

    return `
<style>
${reportCss}
</style>

${html}
`;
}