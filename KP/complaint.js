let complaints = [];
let currentSort = { field: '', order: 'asc' };

document.getElementById('sortBy').addEventListener('change', updateSort);
document.getElementById('sortOrder').addEventListener('change', updateSort);

function updateSort() {
  const sortBy = document.getElementById('sortBy').value;
  const sortOrder = document.getElementById('sortOrder').value;
  
  if (sortBy) {
    currentSort = { field: sortBy, order: sortOrder };
    sortComplaints();
    updateTable();
  }
}

function sortComplaints() {
  complaints.sort((a, b) => {
    let compareA, compareB;
    
    if (currentSort.field === 'date') {
      compareA = new Date(a.createAt);
      compareB = new Date(b.createAt);
    } else if (currentSort.field === 'name') {
      compareA = a.name.toLowerCase();
      compareB = b.name.toLowerCase();
    }
    
    if (currentSort.order === 'asc') {
      return compareA < compareB ? -1 : 1;
    } else {
      return compareA > compareB ? -1 : 1;
    }
  });
}

async function fetchComplaints() {
  try {
    const response = await fetch('http://localhost:5000/complaints');
    const data = await response.json();
    complaints = data.complaints;
    localStorage.setItem('complaints', JSON.stringify(complaints));
    updateComplaintCounters();
    updateTable();
  } catch (error) {
    console.error('Error fetching complaints:', error);
  }
}

function loadComplaintsFromStorage() {
  const storedComplaints = JSON.parse(localStorage.getItem('complaints'));
  if (storedComplaints) {
    complaints = storedComplaints;
    updateComplaintCounters();
    updateTable();
  }
}

function updateComplaintCounters() {
  document.getElementById('totalMasuk').innerText = `${complaints.length} Laporan Masuk`;
  document.getElementById('belumDitanggapi').innerText = `${complaints.filter(c => c.status === 'Pending').length} Belum Ditanggapi`;
  document.getElementById('sudahDitanggapi').innerText = `${complaints.filter(c => c.status === 'Selesai').length} Sudah Ditanggapi`;
}

function getStatusClass(status) {
    switch(status) {
      case 'Pending': return 'status-pending';
      case 'Waiting': return 'status-waiting';
      case 'Completed': return 'status-completed';
      default: return '';
    }
  }

  function getComplaintStatus(complaint) {
    if (complaint.status === 'Selesai') return 'Completed';
    if (complaint.assign_to) return 'Waiting';
    return 'Pending';
  }

  function updateTable() {
    const tableBody = document.getElementById('complaintTableBody');
    tableBody.innerHTML = '';

    complaints.forEach((complaint, index) => {
      const createdAt = new Date(complaint.createAt);
      const formattedDate = !isNaN(createdAt)
        ? createdAt.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : 'Invalid Date';

      const status = getComplaintStatus(complaint);
      const statusClass = getStatusClass(status);

      let imageHtml = complaint.media
        ? `<img src="${complaint.media.startsWith('http') ? complaint.media : `http://localhost:5000/${complaint.media}`}" style="max-width: 100px; max-height: 100px;">`
        : 'No image';

      let assignHtml = '';
      if (!complaint.assign_to) {
        assignHtml = `
          <div class="select-container">
            <select class="assign-dropdown" data-index="${index}">
              <option value="">Select</option>
              <option value="teknisi_komputer">Teknisi Komputer</option>
              <option value="teknisi_ac">Teknisi AC</option>
              <option value="teknisi_elektronik">Teknisi Elektronik</option>
              <option value="teknisi_listrik">Teknisi Listrik</option>
              <option value="teknisi_air">Teknisi Air</option>
              <option value="teknisi_internet">Teknisi Internet/Jaringan</option>
              <option value="cleaning_service">Cleaning Service</option>
              <option value="maintenance_gedung">Maintenance Gedung</option>
              <option value="customer_service">Customer Service</option>
            </select>
          </div>
          <button class="send-button" data-index="${index}">Send</button>
        `;
      } else if (complaint.assign_to && complaint.status !== 'Selesai') {
        assignHtml = `
          <span>Assigned to: ${complaint.assign_to}</span>
          <button class="complete-button" data-id="${complaint.id}">Selesai</button>
        `;
      } else if (complaint.status === 'Selesai') {
        assignHtml = `<span>Selesai oleh ${complaint.assign_to}</span>`;
      }

      const row = `
        <tr class="${complaint.isResponded ? 'responded' : ''}">
          <td>${index + 1}</td>
          <td>${complaint.name}</td>
          <td>${complaint.email}</td>
          <td>${complaint.categories}</td>
          <td>${complaint.phone}</td>
          <td>${complaint.facilities}</td>
          <td>${imageHtml}</td>
          <td>${complaint.isikeluhan}</td>
          <td>${formattedDate}</td>
          <td><span class="status-badge ${statusClass}">${status}</span></td>
          <td>${assignHtml}</td>
        </tr>
      `;
      tableBody.innerHTML += row;
    });

    // Add event listeners for buttons
    document.querySelectorAll('.send-button').forEach(button => {
      button.addEventListener('click', function() {
        const index = this.getAttribute('data-index');
        const assignTo = document.querySelector(`.assign-dropdown[data-index="${index}"]`).value;
        if (assignTo) {
          assignComplaint(complaints[index].id, assignTo);
        }
      });
    });

    document.querySelectorAll('.complete-button').forEach(button => {
      button.addEventListener('click', function() {
        const id = this.getAttribute('data-id');
        markTaskComplete(id);
      });
    });

    // Add event listener to table image cells
    const tableImageCells = document.querySelectorAll('#complaintTableBody td:nth-child(7) img');
    tableImageCells.forEach(img => {
      img.addEventListener('click', showImageModal);
    });

    // Add search functionality
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');

    searchButton.addEventListener('click', () => {
      const searchTerm = searchInput.value.toLowerCase();
      filterComplaints(searchTerm);
    });

    searchInput.addEventListener('keyup', (event) => {
      if (event.key === 'Enter') {
        const searchTerm = searchInput.value.toLowerCase();
        filterComplaints(searchTerm);
      }
    });
  }

  function showImageModal(event) {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const closeButton = document.getElementsByClassName('close-button')[0];

    modalImage.src = event.target.src;
    modal.style.display = 'block';

    closeButton.onclick = function() {
      modal.style.display = 'none';
    }

    window.onclick = function(event) {
      if (event.target == modal) {
        modal.style.display = 'none';
      }
    }
  }

  function filterComplaints(searchTerm) {
    const tableRows = document.querySelectorAll('#complaintTableBody tr');
    tableRows.forEach((row) => {
      const name = row.children[1].textContent.toLowerCase();
      const email = row.children[2].textContent.toLowerCase();
      const categories = row.children[3].textContent.toLowerCase();
      const facilities = row.children[5].textContent.toLowerCase();
      const complaint = row.children[7].textContent.toLowerCase();

      if (
        name.includes(searchTerm) ||
        email.includes(searchTerm) ||
        categories.includes(searchTerm) ||
        facilities.includes(searchTerm) ||
        complaint.includes(searchTerm)
      ) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });
  }

  async function markTaskComplete(id) {
    try {
      const response = await fetch('http://localhost:5000/completeComplaints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id })
      });

      if (response.ok) {
        window.location.reload();
        const complaint = complaints.find(c => c.id === id);
        complaint.status = 'Selesai';
        localStorage.setItem('complaints', JSON.stringify(complaints));
        updateTable();
      } else {
        console.error('Failed to mark task complete');
      }
    } catch (error) {
      console.error('Error marking task complete:', error);
    }
  }

  async function assignComplaint(id, assign_to) {
    try {
      const response = await fetch('http://localhost:5000/assignComplaints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id, assign_to })
      });

      if (response.ok) {
        const complaint = complaints.find(c => c.id === id);
        complaint.assign_to = assign_to;
        complaint.isResponded = true;
        localStorage.setItem('complaints', JSON.stringify(complaints));
        updateTable();
      } else {
        console.error('Failed to assign complaint');
      }
    } catch (error) {
      console.error('Error assigning complaint:', error);
    }
  }

  window.jsPDF = window.jspdf.jsPDF;

  function generatePDF() {
    const doc = new jsPDF();
    
    // Add header with logo (assuming you have a logo)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('SISTEM KELUHAN', doc.internal.pageSize.getWidth()/2, 20, { align: 'center' });
    
    // Add subtitle
    doc.setFontSize(14);
    doc.text('LAPORAN KELUHAN', doc.internal.pageSize.getWidth()/2, 30, { align: 'center' });
    
    // Add metadata with better formatting
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const today = new Date();
    doc.text(`Tanggal Cetak: ${today.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}`, 14, 45);
    
    // Add statistics in a box
    doc.setDrawColor(0);
    doc.setFillColor(240, 240, 240);
    doc.rect(14, 55, 182, 25, 'F');
    
    const total = complaints.length;
    const pending = complaints.filter(c => !c.assign_to).length;
    const inProgress = complaints.filter(c => c.assign_to && c.status !== 'Selesai').length;
    const completed = complaints.filter(c => c.status === 'Selesai').length;
    
    doc.setFontSize(10);
    doc.text('RINGKASAN:', 17, 63);
    doc.text(`Total Laporan: ${total} laporan`, 17, 70);
    doc.text(`Belum Ditanggapi: ${pending} laporan`, 75, 70);
    doc.text(`Dalam Proses: ${inProgress} laporan`, 135, 70);
    doc.text(`Selesai: ${completed} laporan`, 17, 77);
    
    // Prepare table data with more detailed information
    const tableData = complaints.map((complaint, index) => [
      (index + 1).toString(),
      complaint.name,
      complaint.categories,
      complaint.facilities,
      new Date(complaint.createAt).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }),
      getStatusLabel(complaint),
      complaint.assign_to || '-'
    ]);
    
    // Add table with improved styling
    doc.autoTable({
      startY: 90,
      head: [['No', 'Nama Pelapor', 'Kategori', 'Fasilitas', 'Tanggal', 'Status', 'Ditugaskan Kepada']],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 3,
        lineColor: [75, 75, 75],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle'
      },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 35 },
        2: { cellWidth: 25 },
        3: { cellWidth: 30 },
        4: { cellWidth: 25, halign: 'center' },
        5: { cellWidth: 25, halign: 'center' },
        6: { cellWidth: 35 }
      },
      didDrawPage: function(data) {
        // Add header to each page
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(
          'Sistem Keluhan - Generated Report',
          doc.internal.pageSize.getWidth() - 15,
          10,
          { align: 'right' }
        );
        
        // Add page number
        doc.text(
          `Halaman ${doc.internal.getCurrentPageInfo().pageNumber} dari ${doc.internal.getNumberOfPages()}`,
          doc.internal.pageSize.getWidth() - 15,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'right' }
        );
      }
    });
    
    // Add footer with signature section if it's the last page
    const finalY = doc.lastAutoTable.finalY || 90;
    if (finalY < doc.internal.pageSize.getHeight() - 30) {
      doc.setFontSize(10);
      const today = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      doc.text(`Cimahi, ${today}`, doc.internal.pageSize.getWidth() - 15, finalY + 20, { align: 'right' });
      doc.text('Mengetahui,', doc.internal.pageSize.getWidth() - 15, finalY + 30, { align: 'right' });
      doc.text('Admin Sistem', doc.internal.pageSize.getWidth() - 15, finalY + 60, { align: 'right' });
    }
    
    // Save the PDF
    doc.save(`Laporan_Keluhan_${today.toISOString().split('T')[0]}.pdf`);
  }

  // Helper function to get formatted status label
  function getStatusLabel(complaint) {
    if (complaint.status === 'Selesai') return 'Selesai';
    if (complaint.assign_to) return 'Dalam Proses';
    return 'Pending';
  }

  loadComplaintsFromStorage();
  fetchComplaints();