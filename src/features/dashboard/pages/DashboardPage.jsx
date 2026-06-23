import React from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import Welcome from '../components/Welcome';
import ReportList from '../components/ReportList';

export default function DashboardPage() {
  return (
    <div>
      <Topbar />
      <Sidebar />
      <Welcome />
      <ReportList />
    </div>
  );
}
