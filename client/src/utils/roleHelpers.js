export function canManageAdmins(role) {
  return role === 'main_admin';
}

export function canManageNational(role) {
  return role === 'main_admin' || role === 'national_admin';
}

export function canManageChapter(role, adminChapter, targetChapter) {
  if (role === 'main_admin' || role === 'national_admin') return true;
  if (role === 'state_admin') return adminChapter === targetChapter;
  return false;
}

export function canDelete(role) {
  return role === 'main_admin';
}

export function getAdminLabel(role) {
  const labels = {
    main_admin:     'Main Administrator',
    national_admin: 'National Administrator',
    state_admin:    'State Chapter Administrator',
    waqsn_admin:    'WAQSN Administrator',
    yqsf_admin:     'YQSF Administrator',
  };
  return labels[role] || 'Unknown Role';
}

export function getAdminSidebarItems(role) {
  /* ── Base items every admin sees ── */
  const items = [
    { label: 'Dashboard', path: '/admin', icon: 'dashboard' },
  ];

  /* ── WAQSN admin ── */
  if (role === 'waqsn_admin') {
    items.push(
      { label: 'Event Calendar',    path: '/admin/calendar',           icon: 'calendar'   },
      { label: 'Flyer Studio',      path: '/admin/flyer-studio',       icon: 'design'  },
      { label: 'Flyer Requests',    path: '/admin/flyer-requests',     icon: 'moveToInbox'     },
      { label: 'Registrations',     path: '/admin/registrations',      icon: 'userVerified'        },
      { label: 'Webinars',          path: '/admin/webinars',           icon: 'video' },
      { label: 'Workshop Materials',path: '/admin/workshop-materials', icon: 'folderOpen'   },
      { label: 'Contact Info',      path: '/admin/contact-info',       icon: 'phone' },
    );
    return items;
  }

  /* ── YQSF admin ── */
  if (role === 'yqsf_admin') {
    items.push(
      { label: 'Event Calendar',    path: '/admin/calendar',           icon: 'calendar'   },
      { label: 'Flyer Studio',      path: '/admin/flyer-studio',       icon: 'design'  },
      { label: 'Flyer Requests',    path: '/admin/flyer-requests',     icon: 'moveToInbox'     },
      { label: 'Registrations',     path: '/admin/registrations',      icon: 'userVerified'        },
      { label: 'Webinars',          path: '/admin/webinars',           icon: 'video' },
      { label: 'Workshop Materials',path: '/admin/workshop-materials', icon: 'folderOpen'   },
      { label: 'Contact Info',      path: '/admin/contact-info',       icon: 'phone' },
    );
    return items;
  }

  /* ── State admin ── */
  if (role === 'state_admin') {
    items.push(
      { label: 'Event Calendar',    path: '/admin/calendar',           icon: 'calendar'   },
      { label: 'Flyer Studio',      path: '/admin/flyer-studio',       icon: 'design'  },
      { label: 'Flyer Requests',    path: '/admin/flyer-requests',     icon: 'moveToInbox'     },
      { label: 'Registrations',     path: '/admin/registrations',      icon: 'userVerified'        },
      { label: 'Exco Members',      path: '/admin/exco',               icon: 'group'       },
      { label: 'Contact Messages',  path: '/admin/messages',           icon: 'email'         },
      { label: 'Chapter',           path: '/admin/chapters',           icon: 'chapter' },
      { label: 'Members',           path: '/admin/members',            icon: 'group'       },
      { label: 'Chapter Jobs',      path: '/admin/chapter-jobs',       icon: 'jobs'        },
      { label: 'Webinars',          path: '/admin/webinars',           icon: 'video' },
      { label: 'Workshop Materials',path: '/admin/workshop-materials', icon: 'folderOpen'   },
    );
    return items;
  }

  /* ── National admin + Main admin ── */
  items.push(
    { label: 'News',             path: '/admin/news',     icon: 'news'          },
    { label: 'Events',           path: '/admin/events',      icon: 'event'            },
    { label: 'Event Calendar',   path: '/admin/calendar',     icon: 'calendar'    },
    { label: 'Flyer Studio',     path: '/admin/flyer-studio', icon: 'design'   },
    { label: 'Flyer Requests',   path: '/admin/flyer-requests', icon: 'moveToInbox'      },
    { label: 'Registrations',    path: '/admin/registrations', icon: 'userVerified'         },
    { label: 'Published Results', path: '/admin/exam-results', icon: 'task'       },
    { label: 'Exco Members',     path: '/admin/exco',     icon: 'group'           },
    { label: 'Members',          path: '/admin/members',  icon: 'group'           },
    { label: 'Contact Messages', path: '/admin/messages', icon: 'email'             },
    { label: 'Chapters',         path: '/admin/chapters', icon: 'chapter'     },
    { label: 'Job Board',        path: '/admin/jobs',     icon: 'jobs'             },
    { label: 'Chapter Jobs',     path: '/admin/chapter-jobs', icon: 'chapter'      },
    { label: 'Partners',         path: '/admin/partners', icon: 'handshake'        },
    { label: 'Brand Materials',  path: '/admin/brand-materials', icon: 'brand' },
    { label: 'President Profile',path: '/admin/president',       icon: 'account'     },
    { label: 'Past Presidents',  path: '/admin/past-presidents', icon: 'history'           },
    { label: 'QS Firms',          path: '/admin/qs-firms',           icon: 'office'       },
    { label: 'QS Connect',        path: '/admin/qs-connect',         icon: 'book'     },
    { label: 'Webinars',          path: '/admin/webinars',           icon: 'video' },
    { label: 'Workshop Materials',path: '/admin/workshop-materials', icon: 'folderOpen'   },
    { label: 'Journal of QS',     path: '/admin/journal',            icon: 'library' },
    { label: 'Digital Library',   path: '/admin/library',            icon: 'book' },
    { label: 'Contact Info',     path: '/admin/contact-info',    icon: 'phone'      },
    { label: 'Site Settings',    path: '/admin/site-settings',   icon: 'link'              },
  );

  if (canManageAdmins(role)) {
    items.push(
      { label: 'Partner Advert',   path: '/admin/partner-advert', icon: 'announcement'            },
      { label: 'Admin Management', path: '/admin/admins',         icon: 'shield'  },
    );
  }

  return items;
}
