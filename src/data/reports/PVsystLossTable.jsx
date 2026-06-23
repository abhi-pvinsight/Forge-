export default function PVsystLossTable({ data }) {
  if (!data) return null;

  const sections = [
    {
      title: "Irradiation Losses",
      rows: data.irradiation || {},
    },
    {
      title: "Energy Losses",
      rows: data.energy || {},
    },
  ];

  return (
    <div style={{ marginTop: 24 }}>
      <h2>PVsyst Loss Diagram Summary</h2>

      {sections.map(section => (
        <div key={section.title}>
          <h3>{section.title}</h3>

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginBottom: 20,
            }}
          >
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Value</th>
              </tr>
            </thead>

            <tbody>
              {Object.entries(section.rows).map(
                ([key, value]) => (
                  <tr key={key}>
                    <td>{key}</td>
                    <td>{value}</td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}