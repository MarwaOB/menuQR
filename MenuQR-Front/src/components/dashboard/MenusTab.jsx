'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Plus, QrCode, Copy, FilePlus2, TriangleAlert, Trash2, RotateCcw } from 'lucide-react';
import { menuAPI } from '../../utils/api';
import MenuCard from '../UI/MenuCard';
import Modal from '../UI/Modal';
import QRCodeModal from '../QRCodeModal';
import PageHeader from './PageHeader';
import PlateIllustration from '../3d/PlateIllustration';

const MENU_OPTIONS = [
  { value: 'existing', label: 'add_from_existing', hint: 'dashboard.menus.existing_hint', icon: Copy, path: '/menus/newExisting' },
  { value: 'scratch', label: 'add_from_scratch', hint: 'dashboard.menus.scratch_hint', icon: FilePlus2, path: '/menus/newScratch' },
];

function ListSkeleton() {
  return (
    <div className="panel divide-y divide-line overflow-hidden" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-5">
          <div className="skeleton hidden h-11 w-11 rounded-full sm:block" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-40 rounded-full" />
            <div className="skeleton h-3 w-56 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

const MenusTab = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [menus, setMenus] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [showModal, setShowModal] = useState(false);
  const [selectedOption, setSelectedOption] = useState('');
  const [menuToDelete, setMenuToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  const fetchMenus = useCallback(async () => {
    setStatus('loading');
    try {
      const data = await menuAPI.getAll();
      setMenus(Array.isArray(data) ? data : []);
      setStatus('ready');
    } catch (error) {
      console.error('Error fetching all Menus:', error);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    fetchMenus();
  }, [fetchMenus]);

  // Newest first; the first one is what guests currently see.
  const sortedMenus = useMemo(
    () => [...menus].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)),
    [menus]
  );

  const handleConfirmDelete = async () => {
    if (!menuToDelete) return;
    setIsDeleting(true);
    try {
      await menuAPI.delete(menuToDelete.id);
      setMenus((prev) => prev.filter((menu) => menu.id !== menuToDelete.id));
      setMenuToDelete(null);
      toast.success(t('dashboard.menus.deleted'));
    } catch (error) {
      console.error('Error deleting menu:', error);
      toast.error(`${t('error_deleting_menu')}: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const closeAddModal = () => {
    setSelectedOption('');
    setShowModal(false);
  };

  const handleAddMenu = () => {
    const option = MENU_OPTIONS.find((o) => o.value === selectedOption);
    if (!option) return;
    setShowModal(false);
    navigate(option.path);
  };

  return (
    <div>
      <PageHeader
        page="menus"
        meta={status === 'ready' && menus.length > 0 ? t('dashboard.menus.count', { count: menus.length }) : null}
        actions={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowQRModal(true)}>
              <QrCode size={16} strokeWidth={1.75} aria-hidden="true" />
              {t('generate_qr_code')}
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
              <Plus size={16} strokeWidth={2} aria-hidden="true" />
              {t('add_menu')}
            </button>
          </>
        }
      />

      {status === 'loading' && (
        <>
          <span className="sr-only" role="status">{t('common.loading')}</span>
          <ListSkeleton />
        </>
      )}

      {status === 'error' && (
        <div className="panel flex flex-col items-start gap-4 p-8" role="alert">
          <p className="font-display text-2xl">{t('error_fetching_menus', t('common.error'))}</p>
          <button type="button" className="btn btn-ghost btn-sm" onClick={fetchMenus}>
            <RotateCcw size={16} strokeWidth={1.75} aria-hidden="true" />
            {t('dashboard.retry')}
          </button>
        </div>
      )}

      {status === 'ready' && sortedMenus.length === 0 && (
        <div className="panel grid grid-cols-1 items-center gap-8 p-8 sm:p-12 md:grid-cols-12">
          <PlateIllustration className="mx-auto w-40 md:col-span-4 md:w-52" />
          <div className="md:col-span-7 md:col-start-6">
            <h2 className="text-3xl sm:text-4xl">{t('no_menus_found')}</h2>
            <p className="mt-3 max-w-md text-ink-soft">{t('create_first_menu')}</p>
            <button type="button" className="btn btn-primary mt-6" onClick={() => setShowModal(true)}>
              <Plus size={16} strokeWidth={2} aria-hidden="true" />
              {t('add_menu')}
            </button>
          </div>
        </div>
      )}

      {status === 'ready' && sortedMenus.length > 0 && (
        <ul className="panel divide-y divide-line overflow-hidden">
          {sortedMenus.map((menu, i) => (
            <li key={menu.id}>
              <MenuCard
                date={menu.date}
                name={menu.name}
                latest={i === 0}
                onSeeMore={() => navigate(`/menus/${menu.id}`)}
                onDelete={() => setMenuToDelete(menu)}
              />
            </li>
          ))}
        </ul>
      )}

      <QRCodeModal isOpen={showQRModal} onClose={() => setShowQRModal(false)} menuName={t('restaurant_menu')} />

      {/* Add menu: choose a starting point */}
      <Modal isOpen={showModal} onClose={closeAddModal} labelledBy="add-menu-title">
        <h2 id="add-menu-title" className="pe-10 text-2xl">{t('choose_menu_type')}</h2>
        <fieldset className="mt-6 space-y-3">
          <legend className="sr-only">{t('choose_menu_type')}</legend>
          {MENU_OPTIONS.map(({ value, label, hint, icon }) => {
            const Icon = icon;
            const checked = selectedOption === value;
            return (
              <label
                key={value}
                className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition-colors duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-paprika ${
                  checked ? 'border-paprika bg-paprika-soft/40' : 'border-line hover:border-ink/30'
                }`}
              >
                <input
                  type="radio"
                  name="menuOption"
                  value={value}
                  checked={checked}
                  onChange={(e) => setSelectedOption(e.target.value)}
                  className="sr-only"
                />
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    checked ? 'bg-paprika text-paper' : 'bg-cream text-ink-soft'
                  }`}
                  aria-hidden="true"
                >
                  <Icon size={18} strokeWidth={1.75} />
                </span>
                <span>
                  <span className="block font-semibold">{t(label)}</span>
                  <span className="mt-0.5 block text-sm text-muted">{t(hint)}</span>
                </span>
              </label>
            );
          })}
        </fieldset>
        <div className="mt-8 flex justify-end gap-2">
          <button type="button" className="btn btn-quiet btn-sm" onClick={closeAddModal}>
            {t('cancel')}
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleAddMenu} disabled={!selectedOption}>
            {t('confirm')}
          </button>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal isOpen={!!menuToDelete} onClose={() => !isDeleting && setMenuToDelete(null)} labelledBy="delete-menu-title">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger" aria-hidden="true">
          <TriangleAlert size={22} strokeWidth={1.75} />
        </span>
        <h2 id="delete-menu-title" className="mt-5 text-2xl">{t('confirm_delete_menu')}</h2>
        <p className="mt-2 text-sm text-ink-soft">{t('delete_menu_warning', { menuName: menuToDelete?.name })}</p>
        <div className="mt-8 flex justify-end gap-2">
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => setMenuToDelete(null)} disabled={isDeleting}>
            {t('cancel')}
          </button>
          <button type="button" className="btn btn-danger btn-sm" onClick={handleConfirmDelete} disabled={isDeleting}>
            {isDeleting ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-paper border-t-transparent" aria-hidden="true" />
            ) : (
              <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
            )}
            {isDeleting ? t('deleting') : t('delete')}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default MenusTab;
