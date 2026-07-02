// Global variables to store orders state and Chart.js instances
let allOrders = [];
let salesChartInstance = null;
let cityChartInstance = null;

// Session Management Helpers
function getSessionToken() {
  return localStorage.getItem('adminSessionToken') || sessionStorage.getItem('adminSessionToken') || '';
}

function checkAuthentication() {
  const token = getSessionToken();
  const loginOverlay = document.getElementById('login-overlay');
  
  if (!token) {
    // Show login modal, block screen access
    if (loginOverlay) loginOverlay.style.display = 'flex';
  } else {
    // Hide login modal, load dashboard
    if (loginOverlay) loginOverlay.style.display = 'none';
  }
}

// Authentication login API handler
window.handleLogin = function(event) {
  event.preventDefault();
  const password = document.getElementById('adminPassword').value;
  const loginError = document.getElementById('loginError');
  
  if (loginError) loginError.style.display = 'none';

  fetch('/api/admin/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ password })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success && data.token) {
      // Save session token
      localStorage.setItem('adminSessionToken', data.token);
      checkAuthentication();
      loadOrders();
      loadSettings();
    } else {
      if (loginError) {
        loginError.style.display = 'block';
        loginError.textContent = data.error || 'كلمة المرور غير صحيحة!';
      }
    }
  })
  .catch(err => {
    console.error('Login error:', err);
    if (loginError) {
      loginError.style.display = 'block';
      loginError.textContent = 'خطأ في الاتصال بالخادم!';
    }
  });
};

// Logout handler
window.handleLogout = function() {
  localStorage.removeItem('adminSessionToken');
  sessionStorage.removeItem('adminSessionToken');
  checkAuthentication();
};

// DOM Init
document.addEventListener('DOMContentLoaded', () => {
  checkAuthentication();
  
  const token = getSessionToken();
  if (token) {
    loadOrders();
    loadSettings();
  }

  // Set up export button
  const btnExport = document.getElementById('btnExport');
  if (btnExport) {
    btnExport.addEventListener('click', exportToCSV);
  }
});

// Load orders from API
function loadOrders() {
  const token = getSessionToken();
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  fetch('/api/orders', { headers })
    .then(res => {
      if (!res.ok) throw new Error('Not authorized');
      return res.json();
    })
    .then(serverOrders => {
      console.log('Orders loaded successfully from backend.');
      allOrders = serverOrders;
      localStorage.setItem('orders', JSON.stringify(serverOrders));
      renderOrdersTable(serverOrders);
      calculateStats(serverOrders);
      renderAnalyticsCharts(serverOrders);
    })
    .catch(err => {
      console.warn('Backend server error or offline. Loading fallback local data.', err);
      // Fallback local storage or mock orders if empty
      let orders = JSON.parse(localStorage.getItem('orders'));
      if (!orders || orders.length === 0) {
        orders = [];
      }
      allOrders = orders;
      renderOrdersTable(orders);
      calculateStats(orders);
      renderAnalyticsCharts(orders);
    });
}

// Render dynamic orders table rows
function renderOrdersTable(orders) {
  const tableBody = document.getElementById('ordersTableBody');
  if (!tableBody) return;
  
  tableBody.innerHTML = '';
  
  if (orders.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:var(--text-gray);">لا توجد أي طلبات مسجلة حالياً.</td></tr>`;
    return;
  }
  
  orders.forEach((order) => {
    const row = document.createElement('tr');
    
    let statusClass = 'status-new';
    if (order.status === 'تم الشحن') statusClass = 'status-shipped';
    else if (order.status === 'تم التوصيل') statusClass = 'status-delivered';
    else if (order.status === 'ملغي') statusClass = 'status-cancelled';
    
    row.innerHTML = `
      <td style="font-weight:700; color:var(--primary-color);">${order.id}</td>
      <td style="font-size:0.85rem; color:var(--text-gray);">${order.date}</td>
      <td style="font-weight:700;">${order.name}</td>
      <td dir="ltr" style="font-size:0.95rem;">971${order.phone.replace(/^0/, '')}</td>
      <td>${order.city}</td>
      <td style="font-size:0.85rem; max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${order.address}">${order.address}</td>
      <td style="font-size:0.85rem;">${order.packageName}</td>
      <td style="font-weight:700; color:var(--primary-color);">${order.price} AED</td>
      <td>
        <select class="status-select ${statusClass}" onchange="changeOrderStatus('${order.id}', this.value)">
          <option value="جديد" ${order.status === 'جديد' ? 'selected' : ''}>جديد</option>
          <option value="تم الشحن" ${order.status === 'تم الشحن' ? 'selected' : ''}>تم الشحن</option>
          <option value="تم التوصيل" ${order.status === 'تم التوصيل' ? 'selected' : ''}>تم التوصيل</option>
          <option value="ملغي" ${order.status === 'ملغي' ? 'selected' : ''}>ملغي</option>
        </select>
      </td>
      <td>
        <button class="action-btn-danger" onclick="deleteOrder('${order.id}')">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    `;
    
    tableBody.appendChild(row);
  });
}

// Calculate dashboard analytics KPIs
function calculateStats(orders) {
  let totalRevenue = 0;
  let ordersCount = orders.length;
  let pendingCount = 0;
  let activeRevenueCount = 0;
  
  orders.forEach(order => {
    if (order.status !== 'ملغي') {
      totalRevenue += order.price;
      activeRevenueCount++;
    }
    
    if (order.status === 'جديد') {
      pendingCount++;
    }
  });
  
  const aov = activeRevenueCount > 0 ? (totalRevenue / activeRevenueCount) : 0;
  
  document.getElementById('stat-revenue').textContent = `${totalRevenue.toFixed(1)} AED`;
  document.getElementById('stat-orders-count').textContent = ordersCount;
  document.getElementById('stat-pending-count').textContent = pendingCount;
  document.getElementById('stat-aov').textContent = `${aov.toFixed(1)} AED`;
}

// Render Line & Doughnut Charts
function renderAnalyticsCharts(orders) {
  renderSalesTrendChart(orders);
  renderCityPieChart(orders);
}

function renderSalesTrendChart(orders) {
  const canvas = document.getElementById('salesTrendChart');
  if (!canvas) return;

  // Last 7 days map
  const salesMap = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('ar-AE', { day: 'numeric', month: 'numeric' });
    salesMap[dateStr] = 0;
  }

  // Aggregate revenue
  orders.forEach(o => {
    if (o.status === 'ملغي') return;
    try {
      const parts = o.date.split(',');
      const datePart = parts[0].trim();
      const dateObj = new Date(datePart.split('/').reverse().join('-'));
      if (!isNaN(dateObj.getTime())) {
        const key = dateObj.toLocaleDateString('ar-AE', { day: 'numeric', month: 'numeric' });
        if (salesMap[key] !== undefined) {
          salesMap[key] += o.price;
        }
      }
    } catch (_) {}
  });

  const labels = Object.keys(salesMap);
  const data = Object.values(salesMap);

  if (salesChartInstance) {
    salesChartInstance.destroy();
  }

  salesChartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'المبيعات (AED)',
        data: data,
        borderColor: '#0ea5e9',
        backgroundColor: 'rgba(14, 165, 233, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#94a3b8' }
        },
        x: {
          grid: { display: false },
          ticks: { color: '#94a3b8' }
        }
      }
    }
  });
}

function renderCityPieChart(orders) {
  const canvas = document.getElementById('cityChart');
  if (!canvas) return;

  const cityMap = {};
  orders.forEach(o => {
    if (o.status === 'ملغي') return;
    const city = o.city || 'أخرى';
    cityMap[city] = (cityMap[city] || 0) + 1;
  });

  const labels = Object.keys(cityMap);
  const data = Object.values(cityMap);
  const colors = ['#0ea5e9', '#38bdf8', '#0284c7', '#0369a1', '#075985', '#bae6fd', '#f59e0b'];

  if (cityChartInstance) {
    cityChartInstance.destroy();
  }

  cityChartInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors.slice(0, labels.length),
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: '#94a3b8', font: { family: 'Cairo' } }
        }
      }
    }
  });
}

// Client side filtering (Search as typing & filter by status)
window.filterOrdersList = function() {
  const query = document.getElementById('orderSearchInput').value.toLowerCase().trim();
  const filterStatus = document.getElementById('orderStatusFilter').value;

  const filtered = allOrders.filter(order => {
    const matchesSearch = order.name.toLowerCase().includes(query) || order.phone.includes(query);
    const matchesStatus = filterStatus === 'الكل' || order.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  renderOrdersTable(filtered);
};

// Switch dashboard tabs
window.switchTab = function(tabId) {
  const tabs = ['overview', 'orders', 'settings'];
  
  tabs.forEach(t => {
    const btn = document.getElementById(`menu-btn-${t}`);
    const pane = document.getElementById(`tab-${t}`);
    
    if (t === tabId) {
      if (btn) btn.classList.add('active');
      if (pane) pane.style.display = 'block';
    } else {
      if (btn) btn.classList.remove('active');
      if (pane) pane.style.display = 'none';
    }
  });
};

// Change order status update API handler
window.changeOrderStatus = function(orderId, newStatus) {
  const token = getSessionToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Local state update
  allOrders = allOrders.map(o => {
    if (o.id === orderId) o.status = newStatus;
    return o;
  });
  localStorage.setItem('orders', JSON.stringify(allOrders));
  calculateStats(allOrders);
  renderAnalyticsCharts(allOrders);

  // Sync to API backend
  fetch('/api/orders/update', {
    method: 'POST',
    headers,
    body: JSON.stringify({ id: orderId, status: newStatus })
  })
  .then(res => {
    if (!res.ok) throw new Error('Update failed');
    loadOrders();
  })
  .catch(err => {
    console.warn('Failed to sync status update to server:', err);
    loadOrders();
  });
};

// Delete order API handler
window.deleteOrder = function(orderId) {
  if (!confirm('هل أنت متأكد من رغبتك في حذف هذا الطلب نهائياً؟')) return;
  
  const token = getSessionToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  allOrders = allOrders.filter(o => o.id !== orderId);
  localStorage.setItem('orders', JSON.stringify(allOrders));
  calculateStats(allOrders);
  renderAnalyticsCharts(allOrders);

  fetch('/api/orders/delete', {
    method: 'POST',
    headers,
    body: JSON.stringify({ id: orderId })
  })
  .then(res => {
    if (!res.ok) throw new Error('Delete failed');
    loadOrders();
  })
  .catch(err => {
    console.warn('Failed to sync order deletion to server:', err);
    loadOrders();
  });
};

// Export to CSV
function exportToCSV() {
  if (allOrders.length === 0) {
    alert('لا توجد بيانات لتصديرها!');
    return;
  }
  
  let csvContent = "رقم الطلب,تاريخ الطلب,الاسم بالكامل,رقم الهاتف,الإمارة,العنوان التفصيلي,الحزمة المطلوبة,السعر النهائي للمشتري,طريقة الدفع\n";
  
  allOrders.forEach(order => {
    const name = order.name.replace(/,/g, '-');
    const city = order.city.replace(/,/g, '-');
    const address = order.address.replace(/,/g, '-');
    const packageName = order.packageName.replace(/,/g, '-');
    
    csvContent += `${order.id},"${order.date}","${name}",971${order.phone.replace(/^0/, '')},"${city}","${address}","${packageName}",${order.price},"الدفع عند الاستلام"\n`;
  });
  
  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `CleanJet_UAE_Taager_Orders_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  
  link.click();
  document.body.removeChild(link);
}

// Fetch integration settings
function loadSettings() {
  const token = getSessionToken();
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  fetch('/api/admin/settings', { headers })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        document.getElementById('googleSheetsUrl').value = data.google_sheets_url || '';
        document.getElementById('tiktokPixelId').value = data.tiktok_pixel_id || '';
      }
    })
    .catch(err => {
      console.warn('Offline or server error loading settings:', err);
      document.getElementById('googleSheetsUrl').value = localStorage.getItem('googleSheetsUrl') || '';
      document.getElementById('tiktokPixelId').value = localStorage.getItem('tiktokPixelId') || '';
    });
}

// Save integration settings
window.saveSettings = function(event) {
  event.preventDefault();
  const googleSheetsUrl = document.getElementById('googleSheetsUrl').value.trim();
  const tiktokPixelId = document.getElementById('tiktokPixelId').value.trim();

  localStorage.setItem('googleSheetsUrl', googleSheetsUrl);
  localStorage.setItem('tiktokPixelId', tiktokPixelId);

  const token = getSessionToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  fetch('/api/admin/settings', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      google_sheets_url: googleSheetsUrl,
      tiktok_pixel_id: tiktokPixelId
    })
  })
  .then(res => {
    if (!res.ok) throw new Error('Save failed');
    return res.json();
  })
  .then(data => {
    if (data.success) {
      alert('تم حفظ الإعدادات بنجاح!');
    }
  })
  .catch(err => {
    console.error('Error saving settings to server:', err);
    alert('تم حفظ الإعدادات محلياً بنجاح (السيرفر غير متصل).');
  });
};

// Copy Apps Script
window.copyAppsScript = function() {
  const codeArea = document.getElementById('appsScriptCode');
  codeArea.select();
  document.execCommand('copy');
  alert('تم نسخ الكود البرمجي بنجاح! يمكنك الآن لصقه في محرر Apps Script.');
};
