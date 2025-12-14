// Students management với chức năng quản lý lớp
import { db, storage } from './firebase.js';
import { collection, addDoc, onSnapshot, query, where, orderBy, getDocs, doc, updateDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js';

const studentsList = document.getElementById('students-list');
const filterClass = document.getElementById('filter-class');
const searchStudent = document.getElementById('search-student');
const btnAddStudent = document.getElementById('btn-add-student');
const btnManageClasses = document.getElementById('btn-manage-classes');
const studentModal = document.getElementById('student-modal');
const classesModal = document.getElementById('classes-modal');
const quickClassModal = document.getElementById('quick-class-modal');
const closeStudentModal = document.getElementById('close-student-modal');
const closeClassesModal = document.getElementById('close-classes-modal');
const closeQuickClassModal = document.getElementById('close-quick-class-modal');
const saveStudent = document.getElementById('save-student');
const btnQuickAddClass = document.getElementById('btn-quick-add-class');
const saveQuickClass = document.getElementById('save-quick-class');

let editingStudentId = null;
let currentPhotoFile = null;
let editingClassId = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
  loadClasses();
  loadStudents();
  setupEventListeners();
});

function setupEventListeners() {
  // Student modal
  btnAddStudent.addEventListener('click', () => {
    editingStudentId = null;
    document.getElementById('student-modal-title').textContent = 'Thêm học sinh';
    resetStudentForm();
    showModal('student-modal');
  });

  closeStudentModal.addEventListener('click', () => hideModal('student-modal'));
  saveStudent.addEventListener('click', saveStudentHandler);

  // Classes modal
  btnManageClasses.addEventListener('click', () => {
    showModal('classes-modal');
    loadClassesList();
  });

  closeClassesModal.addEventListener('click', () => hideModal('classes-modal'));

  // Quick class modal
  btnQuickAddClass.addEventListener('click', () => showModal('quick-class-modal'));
  closeQuickClassModal.addEventListener('click', () => hideModal('quick-class-modal'));
  saveQuickClass.addEventListener('click', saveQuickClassHandler);

  // Add class functionality
  document.getElementById('btn-add-class').addEventListener('click', addClassHandler);

  // Search and filter
  searchStudent.addEventListener('input', loadStudents);
  filterClass.addEventListener('change', loadStudents);

  // Photo upload
  document.getElementById('stu-photo').addEventListener('change', function(e) {
    currentPhotoFile = e.target.files[0];
  });
}

// Class management functions
function loadClassesList() {
  const classesListContainer = document.getElementById('classes-list-container');
  classesListContainer.innerHTML = '<div class="loading">Đang tải...</div>';

  onSnapshot(collection(db, 'classes'), (snapshot) => {
    classesListContainer.innerHTML = '';
    
    if (snapshot.empty) {
      classesListContainer.innerHTML = '<div class="no-data">Chưa có lớp học nào</div>';
      return;
    }

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const classItem = document.createElement('div');
      classItem.className = 'class-item';
      classItem.innerHTML = `
        <div class="class-info">
          <div class="class-name">${data.name}</div>
          <div class="class-details">
            ${data.grade ? `Khối ${data.grade}` : ''} 
            ${data.teacher ? ` • GV: ${data.teacher}` : ''}
          </div>
        </div>
        <div class="class-actions">
          <button class="btn-small btn-edit" data-id="${docSnap.id}">Sửa</button>
          <button class="btn-small btn-delete" data-id="${docSnap.id}">Xóa</button>
        </div>
      `;
      classesListContainer.appendChild(classItem);
    });

    // Add event listeners for edit and delete buttons
    classesListContainer.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        editingClassId = e.target.dataset.id;
        editClass(editingClassId);
      });
    });

    classesListContainer.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        deleteClass(e.target.dataset.id);
      });
    });
  });
}

function addClassHandler() {
  const name = document.getElementById('new-class-name').value.trim();
  const grade = document.getElementById('new-class-grade').value.trim();
  const teacher = document.getElementById('new-class-teacher').value.trim();

  if (!name) {
    alert('Vui lòng nhập tên lớp!');
    return;
  }

  const classData = {
    name: name,
    grade: grade,
    teacher: teacher,
    createdAt: new Date()
  };

  addDoc(collection(db, 'classes'), classData)
    .then(() => {
      document.getElementById('new-class-name').value = '';
      document.getElementById('new-class-grade').value = '';
      document.getElementById('new-class-teacher').value = '';
      alert('Thêm lớp thành công!');
      loadClasses(); // Reload classes in dropdown
    })
    .catch((error) => {
      alert('Lỗi thêm lớp: ' + error.message);
    });
}

function editClass(classId) {
  getDoc(doc(db, 'classes', classId))
    .then((docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        document.getElementById('new-class-name').value = data.name || '';
        document.getElementById('new-class-grade').value = data.grade || '';
        document.getElementById('new-class-teacher').value = data.teacher || '';
        
        // Change add button to update
        const addBtn = document.getElementById('btn-add-class');
        addBtn.textContent = 'Cập nhật';
        addBtn.onclick = () => updateClassHandler(classId);
      }
    });
}

function updateClassHandler(classId) {
  const name = document.getElementById('new-class-name').value.trim();
  const grade = document.getElementById('new-class-grade').value.trim();
  const teacher = document.getElementById('new-class-teacher').value.trim();

  if (!name) {
    alert('Vui lòng nhập tên lớp!');
    return;
  }

  const classData = {
    name: name,
    grade: grade,
    teacher: teacher,
    updatedAt: new Date()
  };

  updateDoc(doc(db, 'classes', classId), classData)
    .then(() => {
      resetClassForm();
      alert('Cập nhật lớp thành công!');
      loadClasses(); // Reload classes in dropdown
    })
    .catch((error) => {
      alert('Lỗi cập nhật lớp: ' + error.message);
    });
}

function deleteClass(classId) {
  if (confirm('Bạn có chắc muốn xóa lớp này? Học sinh trong lớp sẽ bị xóa khỏi lớp.')) {
    // First, remove class reference from students
    getDocs(query(collection(db, 'students'), where('classId', '==', classId)))
      .then((snapshot) => {
        const updates = snapshot.docs.map(docSnap => 
          updateDoc(doc(db, 'students', docSnap.id), { 
            classId: '', 
            className: '' 
          })
        );
        return Promise.all(updates);
      })
      .then(() => {
        return deleteDoc(doc(db, 'classes', classId));
      })
      .then(() => {
        alert('Xóa lớp thành công!');
        loadClasses(); // Reload classes in dropdown
      })
      .catch((error) => {
        alert('Lỗi xóa lớp: ' + error.message);
      });
  }
}

function resetClassForm() {
  document.getElementById('new-class-name').value = '';
  document.getElementById('new-class-grade').value = '';
  document.getElementById('new-class-teacher').value = '';
  
  const addBtn = document.getElementById('btn-add-class');
  addBtn.textContent = 'Thêm lớp';
  addBtn.onclick = addClassHandler;
  
  editingClassId = null;
}

function saveQuickClassHandler() {
  const name = document.getElementById('quick-class-name').value.trim();
  const grade = document.getElementById('quick-class-grade').value.trim();

  if (!name) {
    alert('Vui lòng nhập tên lớp!');
    return;
  }

  const classData = {
    name: name,
    grade: grade,
    createdAt: new Date()
  };

  addDoc(collection(db, 'classes'), classData)
    .then(() => {
      hideModal('quick-class-modal');
      document.getElementById('quick-class-name').value = '';
      document.getElementById('quick-class-grade').value = '';
      alert('Thêm lớp thành công!');
      loadClasses(); // Reload classes in dropdown
    })
    .catch((error) => {
      alert('Lỗi thêm lớp: ' + error.message);
    });
}

// Existing student management functions (giữ nguyên)
function loadClasses() {
  // ... (giữ nguyên code cũ)
}

function loadStudents() {
  // ... (giữ nguyên code cũ)
}

function resetStudentForm() {
  // ... (giữ nguyên code cũ)
}

function saveStudentHandler() {
  // ... (giữ nguyên code cũ)
}

// Utility functions
function showModal(modalId) {
  document.getElementById(modalId).classList.remove('hidden');
}

function hideModal(modalId) {
  document.getElementById(modalId).classList.add('hidden');
}

// Close modals when clicking outside
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('modal')) {
    e.target.classList.add('hidden');
    if (e.target.id === 'classes-modal') {
      resetClassForm();
    }
  }
});