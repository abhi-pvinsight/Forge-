// Default Client Profiles matching user design
export const DEFAULT_CLIENTS = [
  {
    id: 'client-1',
    name: 'GreenPower Solar',
    clientName: 'GreenPower Solar',
    contact: 'Sarah Jenkins',
    clientContact: 'Sarah Jenkins',
    email: 'sarah.j@greenpowersolar.com',
    clientEmail: 'sarah.j@greenpowersolar.com',
    address: '100 Solar Way, Suite 400, Austin, TX, USA',
    clientAddress: '100 Solar Way, Suite 400, Austin, TX, USA',
    consultant: 'Apex Engineering LLC',
    desc: 'Leading utility-scale solar developer focused on sustainable infrastructure across North America.',
    icon: 'sun',
    iconColor: 'rgb(234, 179, 8)',
    iconBg: 'rgba(234, 179, 8, 0.1)',
  },
  {
    id: 'client-2',
    name: 'Apex Engineering',
    clientName: 'Apex Engineering',
    contact: 'David Miller',
    clientContact: 'David Miller',
    email: 'dmiller@apexengineering.com',
    clientEmail: 'dmiller@apexengineering.com',
    address: '450 Innovation Parkway, Denver, CO, USA',
    clientAddress: '450 Innovation Parkway, Denver, CO, USA',
    consultant: 'Apex Engineering LLC',
    desc: 'Specialized MEP consulting firm providing high-precision electrical designs for commercial projects.',
    icon: 'settings',
    iconColor: 'rgb(59, 130, 246)',
    iconBg: 'rgba(59, 130, 246, 0.1)',
  },
  {
    id: 'client-3',
    name: 'Global Renewables',
    clientName: 'Global Renewables',
    contact: 'Elena Rostova',
    clientContact: 'Elena Rostova',
    email: 'e.rostova@globalrenewables.com',
    clientEmail: 'e.rostova@globalrenewables.com',
    address: '75 Energy Plaza, Toronto, ON, Canada',
    clientAddress: '75 Energy Plaza, Toronto, ON, Canada',
    consultant: 'Forge EPC Solutions',
    desc: 'Multinational energy provider transitioning to a 100% renewable portfolio by 2035.',
    icon: 'briefcase',
    iconColor: 'rgb(168, 85, 247)',
    iconBg: 'rgba(168, 85, 247, 0.1)',
  }
];

export function getStoredClients() {
  try {
    const saved = localStorage.getItem('forge_client_profiles');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
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
