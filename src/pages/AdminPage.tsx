import React, { useState } from 'react';
import AdminLayout from '../components/admin/AdminLayout';
import AdminOverviewDashboard from '../components/admin/AdminOverviewDashboard';
import AdminProductsManager from '../components/admin/AdminProductsManager';
import AdminOrdersManager from '../components/admin/AdminOrdersManager';
import AdminCouponsManager from '../components/admin/AdminCouponsManager';
import AdminHomepageEditor from '../components/admin/AdminHomepageEditor';
import AdminStockAlertsManager from '../components/admin/AdminStockAlertsManager';
import AdminWholesaleManager from '../components/admin/AdminWholesaleManager';
import AdminCustomersManager from '../components/admin/AdminCustomersManager';
import AdminReviewsManager from '../components/admin/AdminReviewsManager';
import AdminContactManager from '../components/admin/AdminContactManager';
import AdminCategoriesManager from '../components/admin/AdminCategoriesManager';
import AdminBannersManager from '../components/admin/AdminBannersManager';
import AdminAnnouncementManager from '../components/admin/AdminAnnouncementManager';
import AdminSettingsManager from '../components/admin/AdminSettingsManager';
import AdminNewsletterManager from '../components/admin/AdminNewsletterManager';
import AdminQuizManager from '../components/admin/AdminQuizManager';

interface AdminPageProps {
  onNavigate: (path: string) => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ onNavigate }) => {
  const [currentTab, setCurrentTab] = useState('overview');

  const renderTabContent = () => {
    switch (currentTab) {
      case 'overview': return <AdminOverviewDashboard />;
      case 'products': return <AdminProductsManager />;
      case 'orders': return <AdminOrdersManager />;
      case 'customers': return <AdminCustomersManager />;
      case 'reviews': return <AdminReviewsManager />;
      case 'coupons': return <AdminCouponsManager />;
      case 'homepage': return <AdminHomepageEditor />;
      case 'contact': return <AdminContactManager />;
      case 'stock-alerts': return <AdminStockAlertsManager />;
      case 'wholesale': return <AdminWholesaleManager />;
      case 'categories': return <AdminCategoriesManager />;
      case 'banners': return <AdminBannersManager />;
      case 'announcement': return <AdminAnnouncementManager />;
      case 'settings': return <AdminSettingsManager />;
      case 'quiz': return <AdminQuizManager />;
      case 'newsletter': return <AdminNewsletterManager />;
      default: return <AdminOverviewDashboard />;
    }
  };

  return (
    <AdminLayout
      currentTab={currentTab}
      onTabChange={setCurrentTab}
      onExitAdmin={() => onNavigate('/')}
    >
      {renderTabContent()}
    </AdminLayout>
  );
};

export default AdminPage;
