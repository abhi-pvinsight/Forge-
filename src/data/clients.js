// Default Client Profile
export const DEFAULT_CLIENTS = [
  {
    id: 'client-demo',
    name: 'Demo',
    clientName: 'Demo',
    contact: 'Demo Contact',
    clientContact: 'Demo Contact',
    email: 'contact@demo.com',
    clientEmail: 'contact@demo.com',
    address: '100 Demo Parkway, Suite 100, Austin, TX, USA',
    clientAddress: '100 Demo Parkway, Suite 100, Austin, TX, USA',
    consultant: 'PV-Insight Engineering LLC',
    desc: 'Demo client profile for testing and previewing project report workflows.',
    icon: 'briefcase',
    iconColor: 'rgb(59, 130, 246)',
    iconBg: 'rgba(59, 130, 246, 0.1)',
  }
];

export function getStoredClients() {
  try {
    const saved = localStorage.getItem('forge_client_profiles');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Filter out legacy mock clients
        const filtered = parsed.filter(c => 
          !['client-1', 'client-2', 'client-3'].includes(c.id) &&
          !['greenpower solar', 'apex engineering', 'global renewables'].includes((c.name || '').toLowerCase().trim())
        );
        if (filtered.length > 0) {
          return filtered;
        }
        localStorage.removeItem('forge_client_profiles');
      }
    }
  } catch (e) {
    console.error('Error reading stored clients:', e);
  }
  return DEFAULT_CLIENTS;
}

export function saveClientProfile(clientData) {
  const current = getStoredClients();
  const newClient = {
    id: 'client-' + Date.now(),
    name: clientData.clientName || clientData.name || 'New Client',
    clientName: clientData.clientName || clientData.name || 'New Client',
    contact: clientData.clientContact || clientData.contact || '',
    clientContact: clientData.clientContact || clientData.contact || '',
    email: clientData.clientEmail || clientData.email || '',
    clientEmail: clientData.clientEmail || clientData.email || '',
    address: clientData.clientAddress || clientData.address || '',
    clientAddress: clientData.clientAddress || clientData.address || '',
    consultant: clientData.consultant || 'Forge EPC',
    desc: clientData.desc || 'Registered client profile for report basis generation.',
    icon: 'briefcase',
    iconColor: 'rgb(16, 185, 129)',
    iconBg: 'rgba(16, 185, 129, 0.1)',
  };
  const updated = [...current, newClient];
  try {
    localStorage.setItem('forge_client_profiles', JSON.stringify(updated));
  } catch (e) {
    console.error('Error saving new client profile:', e);
  }
  return updated;
}

export function deleteClientProfile(clientId) {
  const current = getStoredClients();
  const updated = current.filter(c => c.id !== clientId);
  try {
    localStorage.setItem('forge_client_profiles', JSON.stringify(updated));
  } catch (e) {
    console.error('Error deleting client profile:', e);
  }
  return updated;
}
