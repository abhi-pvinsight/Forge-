export function docNumber(values) {
  const code = values?.projectCode || "SH2";
  const rev = values?.revision || "R0";

  return `${code}-STR-${rev}`;
}
