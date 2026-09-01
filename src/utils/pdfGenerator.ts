import { Incident, Mechanic } from './store';

// Helper to format currency LKR
function formatLKR(amount: number): string {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    maximumFractionDigits: 2,
  }).format(amount);
}

// RouteRescue LK SVG Logo Data URI for High-Resolution PDF Header
const ROUTERESCUE_LOGO_SVG = `
<svg width="60" height="60" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="46" fill="#0F172A" stroke="#FF5722" stroke-width="4"/>
  <path d="M30 68L50 24L70 68" stroke="#FF5722" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="50" cy="54" r="7" fill="#00E5FF"/>
  <path d="M22 76H78" stroke="#00E5FF" stroke-width="4" stroke-linecap="round"/>
</svg>
`;

/**
 * Trigger clean branded browser print-to-PDF window
 */
function printHtmlToPdf(title: string, htmlContent: string) {
  const printWindow = window.open('', '_blank', 'width=900,height=1000');
  if (!printWindow) {
    alert('Please allow popups to download your PDF document.');
    return;
  }

  const fullDoc = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>${title}</title>
        <style>
          @media print {
            @page {
              size: A4;
              margin: 15mm;
            }
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
          * {
            box-sizing: border-box;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          }
          body {
            margin: 0;
            padding: 24px;
            color: #0f172a;
            background: #ffffff;
            font-size: 13px;
            line-height: 1.5;
          }
          .header-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
            border-bottom: 3px solid #ff5722;
            padding-bottom: 16px;
          }
          .brand-title {
            font-size: 24px;
            font-weight: 900;
            color: #0f172a;
            letter-spacing: -0.5px;
            margin: 0;
          }
          .brand-subtitle {
            font-size: 11px;
            font-weight: 700;
            color: #ff5722;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .doc-badge {
            display: inline-block;
            background: #0f172a;
            color: #ffffff;
            padding: 6px 14px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 24px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 16px;
            border-radius: 8px;
          }
          .meta-item {
            font-size: 12px;
          }
          .meta-label {
            font-size: 10px;
            font-weight: 800;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
          }
          .meta-value {
            font-weight: 700;
            color: #0f172a;
          }
          table.data-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 16px;
            margin-bottom: 24px;
          }
          table.data-table th {
            background: #0f172a;
            color: #ffffff;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 10px 12px;
            text-align: left;
          }
          table.data-table td {
            padding: 12px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 12px;
          }
          table.data-table tr:nth-child(even) {
            background: #f8fafc;
          }
          .total-box {
            float: right;
            width: 280px;
            background: #f8fafc;
            border: 2px solid #0f172a;
            border-radius: 8px;
            padding: 14px;
            margin-bottom: 30px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            font-size: 13px;
            margin-bottom: 6px;
          }
          .total-row.grand {
            font-size: 16px;
            font-weight: 900;
            color: #ff5722;
            border-top: 2px dashed #cbd5e1;
            padding-top: 8px;
            margin-top: 8px;
            margin-bottom: 0;
          }
          .footer-note {
            clear: both;
            margin-top: 40px;
            padding-top: 16px;
            border-top: 1px solid #e2e8f0;
            font-size: 10px;
            color: #94a3b8;
            text-align: center;
          }
          .stamp {
            display: inline-block;
            border: 2px double #10b981;
            color: #10b981;
            font-size: 12px;
            font-weight: 900;
            padding: 4px 12px;
            border-radius: 4px;
            text-transform: uppercase;
            letter-spacing: 1px;
            transform: rotate(-3deg);
          }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
    </html>
  `;

  printWindow.document.write(fullDoc);
  printWindow.document.close();

  // Trigger print dialog automatically after document rendering
  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 350);
}

/**
 * 1. Generate Individual Motorist / Repair Incident Invoice PDF
 */
export function generateIncidentInvoicePDF(incident: any, mechanic?: any) {
  const incidentDate = new Date(incident.timestamp || Date.now()).toLocaleString('en-LK', {
    dateStyle: 'full',
    timeStyle: 'medium',
  });

  const baseTariff = Number(incident.baseTariff) || 1000;
  const distKm = Number(incident.distanceKm) || 0;
  const distFee = Math.round(distKm * 150); // 150 LKR per km
  const platformFee = 250; // Standard 250 LKR Platform Triage Charge
  const grandTotal = baseTariff + distFee + platformFee;

  const html = `
    <table class="header-table">
      <tr>
        <td style="width: 70px; vertical-align: top;">
          ${ROUTERESCUE_LOGO_SVG}
        </td>
        <td style="vertical-align: top; padding-left: 12px;">
          <div class="brand-title">RouteRescue LK</div>
          <div class="brand-subtitle">Emergency Roadside Assistance & Diagnostics</div>
          <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
            Headquarters: 45 Galle Road, Colombo 03, Sri Lanka | Hotline: +94 11 234 5678
          </div>
        </td>
        <td style="text-align: right; vertical-align: top;">
          <div class="doc-badge">OFFICIAL INVOICE</div>
          <div style="font-size: 11px; font-weight: 700; color: #475569; margin-top: 6px;">
            #INV-${incident.id.slice(-6).toUpperCase()}
          </div>
          <div style="margin-top: 8px;">
            <span class="stamp">PAID & RESOLVED</span>
          </div>
        </td>
      </tr>
    </table>

    <div class="meta-grid">
      <div>
        <div class="meta-item">
          <div class="meta-label">Motorist / Driver Name</div>
          <div class="meta-value">${incident.driverName || 'Motorist Client'}</div>
        </div>
        <div class="meta-item" style="margin-top: 8px;">
          <div class="meta-label">Driver Contact Mobile</div>
          <div class="meta-value">${incident.driverPhone || 'N/A'}</div>
        </div>
        <div class="meta-item" style="margin-top: 8px;">
          <div class="meta-label">Date & Time of Incident</div>
          <div class="meta-value">${incidentDate}</div>
        </div>
      </div>
      <div>
        <div class="meta-item">
          <div class="meta-label">Assigned Mobile Garage / Workshop</div>
          <div class="meta-value">${mechanic?.businessName || mechanic?.name || 'Verified RouteRescue Mobile Garage'}</div>
        </div>
        <div class="meta-item" style="margin-top: 8px;">
          <div class="meta-label">Dispatched Technician / Employee</div>
          <div class="meta-value">${incident.assignedEmployee?.name ? `${incident.assignedEmployee.name} (${incident.assignedEmployee.role})` : 'Lead Mobile Mechanic'}</div>
        </div>
        <div class="meta-item" style="margin-top: 8px;">
          <div class="meta-label">Garage Contact Phone</div>
          <div class="meta-value">${mechanic?.phone || '+94 77 123 4567'}</div>
        </div>
      </div>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th>Item / Service Description</th>
          <th>Category</th>
          <th style="text-align: center;">Distance</th>
          <th style="text-align: right;">Amount (LKR)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <strong>Emergency Breakdown Triage & Labor Fee</strong>
            <div style="font-size: 10px; color: #64748b;">On-site mechanical diagnostics and emergency repair dispatch</div>
          </td>
          <td><span style="font-weight: 700; color: #ff5722;">${incident.category}</span></td>
          <td style="text-align: center;">-</td>
          <td style="text-align: right; font-weight: 700;">${formatLKR(baseTariff)}</td>
        </tr>
        <tr>
          <td>
            <strong>Mobile Mechanic Dispatch Mileage Charge</strong>
            <div style="font-size: 10px; color: #64748b;">Calculated @ 150 LKR / km from garage base</div>
          </td>
          <td>Towing / Transit</td>
          <td style="text-align: center; font-weight: 700;">${distKm} km</td>
          <td style="text-align: right; font-weight: 700;">${formatLKR(distFee)}</td>
        </tr>
        <tr>
          <td>
            <strong>RouteRescue LK Platform Safety & Dispatch Fee</strong>
            <div style="font-size: 10px; color: #64748b;">Includes 24/7 GPS tracking and AI diagnostic support</div>
          </td>
          <td>Platform Service</td>
          <td style="text-align: center;">-</td>
          <td style="text-align: right; font-weight: 700;">${formatLKR(platformFee)}</td>
        </tr>
      </tbody>
    </table>

    <div class="total-box">
      <div class="total-row">
        <span>Base Repair Tariff:</span>
        <span>${formatLKR(baseTariff)}</span>
      </div>
      <div class="total-row">
        <span>Mileage Transit Fee:</span>
        <span>${formatLKR(distFee)}</span>
      </div>
      <div class="total-row">
        <span>Platform Service Fee:</span>
        <span>${formatLKR(platformFee)}</span>
      </div>
      <div class="total-row grand">
        <span>TOTAL PAID:</span>
        <span>${formatLKR(grandTotal)}</span>
      </div>
    </div>

    <div class="footer-note">
      Thank you for choosing RouteRescue LK. Drive safely! For queries, contact support@routerescuelk.lk.
      <br/>
      This is a computer-generated official tax invoice verified by RouteRescue LK Systems.
    </div>
  `;

  printHtmlToPdf(`RouteRescue_Invoice_INV-${incident.id.slice(-6).toUpperCase()}`, html);
}

/**
 * 2. Generate Garage / Mechanic Monthly Operations & Earnings PDF Report
 */
export function generateGarageMonthlyReportPDF(mechanic: any, incidents: any[], monthYearStr: string) {
  const completedJobs = incidents.filter(
    (i) => String(i.mechanicId) === String(mechanic.id) && i.status === 'Resolved'
  );

  const totalGross = completedJobs.reduce((sum, i) => sum + (Number(i.baseTariff) || 1000) + Math.round((Number(i.distanceKm) || 0) * 150), 0);
  const platformFeeDeduction = Math.round(totalGross * 0.08); // 8% platform commission
  const netEarnings = totalGross - platformFeeDeduction;

  const html = `
    <table class="header-table">
      <tr>
        <td style="width: 70px; vertical-align: top;">
          ${ROUTERESCUE_LOGO_SVG}
        </td>
        <td style="vertical-align: top; padding-left: 12px;">
          <div class="brand-title">RouteRescue LK</div>
          <div class="brand-subtitle">Garage Partner Monthly Performance & Earnings Report</div>
          <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
            Partner Garage: <strong>${mechanic.businessName || mechanic.name}</strong> (${mechanic.city}) | Tier: <strong>${mechanic.tier}</strong>
          </div>
        </td>
        <td style="text-align: right; vertical-align: top;">
          <div class="doc-badge" style="background: #2563eb;">GARAGE REPORT</div>
          <div style="font-size: 11px; font-weight: 700; color: #475569; margin-top: 6px;">
            Period: ${monthYearStr}
          </div>
        </td>
      </tr>
    </table>

    <div class="meta-grid">
      <div>
        <div class="meta-item">
          <div class="meta-label">Garage / Workshop Name</div>
          <div class="meta-value">${mechanic.businessName || mechanic.name}</div>
        </div>
        <div class="meta-item" style="margin-top: 8px;">
          <div class="meta-label">Registered Region / City</div>
          <div class="meta-value">${mechanic.city}</div>
        </div>
      </div>
      <div>
        <div class="meta-item">
          <div class="meta-label">Total Completed Dispatches</div>
          <div class="meta-value" style="color: #10b981;">${completedJobs.length} Jobs Completed</div>
        </div>
        <div class="meta-item" style="margin-top: 8px;">
          <div class="meta-label">Net Payable Revenue</div>
          <div class="meta-value" style="color: #ff5722; font-size: 14px;">${formatLKR(netEarnings)}</div>
        </div>
      </div>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th>Incident ID</th>
          <th>Date / Time</th>
          <th>Category</th>
          <th>Client Name</th>
          <th>Distance</th>
          <th style="text-align: right;">Gross Fee (LKR)</th>
        </tr>
      </thead>
      <tbody>
        ${
          completedJobs.length > 0
            ? completedJobs
                .map(
                  (job) => `
          <tr>
            <td><strong>#INV-${job.id.slice(-6).toUpperCase()}</strong></td>
            <td>${new Date(job.timestamp).toLocaleDateString()}</td>
            <td><span style="font-weight: 700; color: #ff5722;">${job.category}</span></td>
            <td>${job.driverName || 'Motorist Client'}</td>
            <td>${job.distanceKm || 0} km</td>
            <td style="text-align: right; font-weight: 700;">${formatLKR((Number(job.baseTariff) || 1000) + Math.round((Number(job.distanceKm) || 0) * 150))}</td>
          </tr>
        `
                )
                .join('')
            : `<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 20px;">No completed repair jobs recorded for this billing cycle.</td></tr>`
        }
      </tbody>
    </table>

    <div class="total-box">
      <div class="total-row">
        <span>Total Gross Repairs:</span>
        <span>${formatLKR(totalGross)}</span>
      </div>
      <div class="total-row">
        <span>Platform Commission (8%):</span>
        <span style="color: #ef4444;">-${formatLKR(platformFeeDeduction)}</span>
      </div>
      <div class="total-row grand">
        <span>NET GARAGE EARNINGS:</span>
        <span>${formatLKR(netEarnings)}</span>
      </div>
    </div>

    <div class="footer-note">
      RouteRescue LK Financial System &copy; ${new Date().getFullYear()}. Confirmed and generated for ${mechanic.businessName || mechanic.name}.
    </div>
  `;

  printHtmlToPdf(`RouteRescue_Monthly_Report_${mechanic.name.replace(/\s+/g, '_')}_${monthYearStr}`, html);
}

/**
 * 3. Generate Super Admin Platform Monthly Executive PDF Report
 */
export function generateAdminExecutiveReportPDF(incidents: any[], mechanics: any[], monthYearStr: string) {
  const totalIncidents = incidents.length;
  const resolvedIncidents = incidents.filter((i) => i.status === 'Resolved');
  const cancelledIncidents = incidents.filter((i) => i.status === 'Cancelled');
  const activeIncidents = incidents.filter((i) => i.status !== 'Resolved' && i.status !== 'Cancelled');

  const totalGrossRevenue = resolvedIncidents.reduce(
    (sum, i) => sum + (Number(i.baseTariff) || 1000) + Math.round((Number(i.distanceKm) || 0) * 150) + 250,
    0
  );
  const totalPlatformFees = resolvedIncidents.length * 250 + Math.round(totalGrossRevenue * 0.08);

  const html = `
    <table class="header-table">
      <tr>
        <td style="width: 70px; vertical-align: top;">
          ${ROUTERESCUE_LOGO_SVG}
        </td>
        <td style="vertical-align: top; padding-left: 12px;">
          <div class="brand-title">RouteRescue LK</div>
          <div class="brand-subtitle">Executive Platform Monthly Operations & Revenue Report</div>
          <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
            Super Admin Control Center | Sri Lanka Network Operations Audit
          </div>
        </td>
        <td style="text-align: right; vertical-align: top;">
          <div class="doc-badge" style="background: #059669;">EXECUTIVE REPORT</div>
          <div style="font-size: 11px; font-weight: 700; color: #475569; margin-top: 6px;">
            Reporting Period: ${monthYearStr}
          </div>
        </td>
      </tr>
    </table>

    <div class="meta-grid">
      <div>
        <div class="meta-item">
          <div class="meta-label">Total Reported Incidents</div>
          <div class="meta-value">${totalIncidents} Total Requests</div>
        </div>
        <div class="meta-item" style="margin-top: 8px;">
          <div class="meta-label">Successful Resolution Rate</div>
          <div class="meta-value" style="color: #10b981;">
            ${totalIncidents > 0 ? ((resolvedIncidents.length / totalIncidents) * 100).toFixed(1) : '100'}% (${resolvedIncidents.length} Resolved)
          </div>
        </div>
      </div>
      <div>
        <div class="meta-item">
          <div class="meta-label">Total Platform Revenue (Gross)</div>
          <div class="meta-value" style="font-size: 14px;">${formatLKR(totalGrossRevenue)}</div>
        </div>
        <div class="meta-item" style="margin-top: 8px;">
          <div class="meta-label">Net Platform Commission Earned</div>
          <div class="meta-value" style="color: #059669; font-size: 14px; font-weight: 900;">${formatLKR(totalPlatformFees)}</div>
        </div>
      </div>
    </div>

    <h3 style="font-size: 13px; font-weight: 800; text-transform: uppercase; color: #0f172a; margin-top: 24px; margin-bottom: 8px;">
      Verified Partner Garages Overview (${mechanics.length} Registered)
    </h3>
    <table class="data-table">
      <thead>
        <tr>
          <th>Garage / Business Name</th>
          <th>City / Region</th>
          <th>Service Tier</th>
          <th>Status</th>
          <th style="text-align: right;">Completed Dispatches</th>
        </tr>
      </thead>
      <tbody>
        ${mechanics
          .slice(0, 10)
          .map(
            (m) => `
          <tr>
            <td><strong>${m.businessName || m.name}</strong></td>
            <td>${m.city}</td>
            <td><span style="font-weight: 700; color: #2563eb;">${m.tier}</span></td>
            <td><span style="color: #10b981; font-weight: 700;">${m.status}</span></td>
            <td style="text-align: right; font-weight: 700;">
              ${incidents.filter((i) => String(i.mechanicId) === String(m.id) && i.status === 'Resolved').length} Jobs
            </td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>

    <div class="footer-note">
      Confidential Executive Document &copy; ${new Date().getFullYear()} RouteRescue LK Systems. Exported by Super Admin.
    </div>
  `;

  printHtmlToPdf(`RouteRescue_Platform_Executive_Report_${monthYearStr}`, html);
}
