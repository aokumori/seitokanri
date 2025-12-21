// Students management using Firebase Compat API

// Firebase instances (loaded from firebase-init.js)
let db = null;
let auth = null;
let firebase = window.firebase || null;

// Wait for Firebase compat to load
if (window.firebase) {
  db = firebase.firestore();
  auth = firebase.auth();
  console.log('✅ Firebase compat initialized for students.js');
} else {
  console.error('❌ Firebase compat not loaded');
}

// Cloudinary config
const CLOUDINARY_CLOUD_NAME = 'dlcb3l2ec';
const CLOUDINARY_UPLOAD_PRESET = 'student_photos';

// Upload to Cloudinary
async function uploadToCloudinary(file) {
  if (!file) return null;
  
  try {
    console.log('☁️ Uploading to Cloudinary:', file.name);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      console.error('❌ Cloudinary upload failed:', response.status);
      return null;
    }
    
    const data = await response.json();
    console.log('✅ Cloudinary upload successful');
    return data.secure_url || data.url;
    
  } catch (err) {
    console.error('❌ Cloudinary upload error:', err);
    return null;
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 DOM Content Loaded for students.js');
  
  if (!auth) {
    console.error('❌ Firebase not initialized');
    return;
  }
  
  auth.onAuthStateChanged(user => {
    if (!user) {
      console.log('❌ No user, redirecting to login');
      window.location.href = 'index.html';
      return;
    }
    console.log('✅ User authenticated:', user.uid);
    
    // Check user role
    db.collection('users').doc(user.uid).get().then(doc => {
      if (doc.exists) {
        const userData = doc.data();
        const userRole = userData.role || 'teacher';
        
        // Redirect students to their own profile
        if (userRole === 'student') {
          db.collection('students').where('email', '==', userData.email).get().then(snapshot => {
            if (!snapshot.empty) {
              const studentId = snapshot.docs[0].id;
              window.location.href = `student-detail.html?studentId=${studentId}`;
            } else {
              alert('Không tìm thấy hồ sơ học sinh. Vui lòng liên hệ giáo viên.');
              window.location.href = 'dashboard.html';
            }
          }).catch(err => {
            console.error('❌ Error finding student:', err);
            window.location.href = 'dashboard.html';
          });
          return;
        }
        
        loadClasses();
        loadStudents();
        setupEventListeners();
      } else {
        loadClasses();
        loadStudents();
        setupEventListeners();
      }
    });
  });
});

function setupEventListeners() {
  console.log('🔗 Setting up event listeners');
  
  const btnAddStudent = document.getElementById('btn-add-student');
  const closeStudentModal = document.getElementById('close-student-modal');
  const saveStudent = document.getElementById('save-student');
  const btnManageClasses = document.getElementById('btn-manage-classes');
  const closeClassesModal = document.getElementById('close-classes-modal');
  const btnQuickAddClass = document.getElementById('btn-quick-add-class');
  const closeQuickClassModal = document.getElementById('close-quick-class-modal');
  const saveQuickClass = document.getElementById('save-quick-class');
  const searchStudent = document.getElementById('search-student');
  const filterClass = document.getElementById('filter-class');
  
  // Student modal
  if (btnAddStudent) {
    btnAddStudent.addEventListener('click', () => {
      window.editingStudentId = null;
      const title = document.getElementById('student-modal-title');
      if (title) title.textContent = 'Thêm học sinh';
      resetStudentForm();
      showModal('student-modal');
    });
  }

  if (closeStudentModal) {
    closeStudentModal.addEventListener('click', () => hideModal('student-modal'));
  }
  if (saveStudent) {
    saveStudent.addEventListener('click', saveStudentHandler);
  }

  // Classes modal
  if (btnManageClasses) {
    btnManageClasses.addEventListener('click', () => {
      showModal('classes-modal');
      loadClassesList();
    });
  }

  if (closeClassesModal) {
    closeClassesModal.addEventListener('click', () => hideModal('classes-modal'));
  }

  // Quick class modal
  if (btnQuickAddClass) {
    btnQuickAddClass.addEventListener('click', () => showModal('quick-class-modal'));
  }
  if (closeQuickClassModal) {
    closeQuickClassModal.addEventListener('click', () => hideModal('quick-class-modal'));
  }
  if (saveQuickClass) {
    saveQuickClass.addEventListener('click', saveQuickClassHandler);
  }

  // Add class functionality
  const btnAddClass = document.getElementById('btn-add-class');
  if (btnAddClass) {
    btnAddClass.addEventListener('click', addClassHandler);
  }

  // Search and filter
  if (searchStudent) {
    searchStudent.addEventListener('input', loadStudents);
  }
  if (filterClass) {
    filterClass.addEventListener('change', loadStudents);
  }

  // Photo upload
  const stuPhoto = document.getElementById('stu-photo');
  if (stuPhoto) {
    stuPhoto.addEventListener('change', function(e) {
      window.currentPhotoFile = e.target.files[0];
      console.log('📸 Photo selected:', window.currentPhotoFile?.name || 'None');
    });
  }
}

// Load and display classes in dropdown
function loadClasses() {
  console.log('📦 Loading classes for dropdown');
  
  const filterClass = document.getElementById('filter-class');
  if (!filterClass) {
    console.warn('⚠️ filter-class element not found');
    return;
  }

  db.collection('classes')
    .get()
    .then((snapshot) => {
      console.log('✅ Classes loaded:', snapshot.size);
      filterClass.innerHTML = '<option value="">Tất cả lớp</option>';
      
      // Sort by createdAt descending
      const docs = snapshot.docs.sort((a, b) => {
        const timeA = a.data().createdAt?.toMillis?.() || 0;
        const timeB = b.data().createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });
      
      docs.forEach(doc => {
        const data = doc.data();
        const option = document.createElement('option');
        option.value = doc.id;
        option.textContent = data.name || 'Chưa đặt tên';
        filterClass.appendChild(option);
      });
    })
    .catch((error) => {
      console.error('❌ Error loading classes:', error);
      filterClass.innerHTML = '<option value="">Lỗi tải lớp</option>';
    });
}

// Clean up orphaned students (students with non-existent classId) to prevent duplicate emails
async function cleanupOrphanedStudents() {
  try {
    console.log('🧹 Cleaning up orphaned students...');
    
    // Get all classes
    const classesSnapshot = await db.collection('classes').get();
    const validClassIds = new Set();
    classesSnapshot.forEach(doc => {
      validClassIds.add(doc.id);
    });
    
    // Get all students
    const studentsSnapshot = await db.collection('students').get();
    let orphanedCount = 0;
    
    const deletePromises = [];
    studentsSnapshot.forEach(doc => {
      const studentData = doc.data();
      // If student has a classId that doesn't exist in classes, delete it
      if (studentData.classId && !validClassIds.has(studentData.classId)) {
        console.log(`🗑️ Deleting orphaned student ${doc.id} (classId: ${studentData.classId} not found)`);
        deletePromises.push(db.collection('students').doc(doc.id).delete());
        orphanedCount++;
      }
    });
    
    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
      console.log(`✅ Cleaned up ${orphanedCount} orphaned students`);
    } else {
      console.log('✅ No orphaned students found');
    }
  } catch (error) {
    console.error('❌ Error cleaning up orphaned students:', error);
  }
}

// Load and display students
async function loadStudents() {
  console.log('👨‍🎓 Loading students');
  
  // First clean up orphaned students
  await cleanupOrphanedStudents();
  
  const studentsList = document.getElementById('students-list');
  const filterClass = document.getElementById('filter-class');
  const searchStudent = document.getElementById('search-student');
  
  if (!studentsList) {
    console.error('❌ students-list element not found');
    return;
  }

  studentsList.innerHTML = '<div class="loading">Đang tải học sinh...</div>';

  let query = db.collection('students');
  
  // Apply class filter
  const selectedClass = filterClass?.value;
  if (selectedClass) {
    query = query.where('classId', '==', selectedClass);
  }

  query
    .get()
    .then((snapshot) => {
      console.log('✅ Students loaded:', snapshot.size);
      studentsList.innerHTML = '';

      if (snapshot.empty) {
        studentsList.innerHTML = '<div class="no-data">Không có học sinh nào</div>';
        return;
      }

      // Sort by createdAt descending (client-side)
      let filteredDocs = snapshot.docs.sort((a, b) => {
        const timeA = a.data().createdAt?.toMillis?.() || 0;
        const timeB = b.data().createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });
      
      // Apply search filter
      const searchTerm = searchStudent?.value.toLowerCase() || '';
      if (searchTerm) {
        filteredDocs = filteredDocs.filter(doc => {
          const data = doc.data();
          return data.name?.toLowerCase().includes(searchTerm) ||
                 data.email?.toLowerCase().includes(searchTerm) ||
                 data.phone?.includes(searchTerm);
        });
      }

      if (filteredDocs.length === 0) {
        studentsList.innerHTML = '<div class="no-data">Không tìm thấy học sinh</div>';
        return;
      }

      filteredDocs.forEach(doc => {
        const data = doc.data();
        const studentCard = createStudentCard(doc.id, data);
        studentsList.appendChild(studentCard);
      });
    })
    .catch((error) => {
      console.error('❌ Error loading students:', error);
      studentsList.innerHTML = `<div class="error">Lỗi tải danh sách: ${error.message}</div>`;
    });
}

// Create student card element
function createStudentCard(studentId, data) {
  const card = document.createElement('div');
  card.className = 'student-card glass';
  
  const photoUrl = data.photoUrl || 'https://via.placeholder.com/80?text=No+Photo';
  
  card.innerHTML = `
    <img src="${photoUrl}" alt="${data.name}" class="student-photo">
    <div class="student-info">
      <h4>${data.name}</h4>
      <p>📧 ${data.email || 'N/A'}</p>
      <p>📱 ${data.phone || 'N/A'}</p>
      <p>🎓 ${data.className || 'Chưa phân lớp'}</p>
    </div>
    <div class="student-actions">
      <button class="btn-secondary view-detail" data-id="${studentId}" title="Xem chi tiết">👁️</button>
      <button class="btn-secondary edit-student" data-id="${studentId}" title="Sửa">✏️</button>
      <button class="btn-secondary delete-student" data-id="${studentId}" title="Xóa">🗑️</button>
    </div>
  `;

  // Add event listeners
  card.querySelector('.view-detail').addEventListener('click', () => {
    window.location.href = `student-detail.html?studentId=${studentId}`;
  });

  card.querySelector('.edit-student').addEventListener('click', () => {
    editStudent(studentId, data);
  });

  card.querySelector('.delete-student').addEventListener('click', () => {
    deleteStudent(studentId);
  });

  // Check if current user is a student - hide edit/delete buttons
  db.collection('users').doc(auth.currentUser.uid).get().then(doc => {
    if (doc.exists && doc.data().role === 'student') {
      card.querySelector('.edit-student').style.display = 'none';
      card.querySelector('.delete-student').style.display = 'none';
    }
  });

  return card;
}

// Reset student form
function resetStudentForm() {
  const form = document.getElementById('student-form');
  if (form) {
    form.reset();
  }
  window.currentPhotoFile = null;
  window.editingStudentId = null;
}

// Save student (create or update)
async function saveStudentHandler() {
  console.log('💾 Saving student');
  
  try {
    // Get form elements safely
    const stuNameEl = document.getElementById('stu-name');
    const stuEmailEl = document.getElementById('stu-email');
    const stuPhoneEl = document.getElementById('stu-phone');
    const stuGenderEl = document.getElementById('stu-gender');
    const stuBirthdateEl = document.getElementById('stu-birthdate');
    const stuClassEl = document.getElementById('stu-class');
    
    // Check if critical form elements exist
    if (!stuNameEl || !stuEmailEl || !stuClassEl) {
      alert('❌ Lỗi form: Thiếu các trường yêu cầu. Kiểm tra HTML.');
      console.error('❌ Missing form elements', {
        stuName: !!stuNameEl,
        stuEmail: !!stuEmailEl,
        stuClass: !!stuClassEl
      });
      return;
    }
    
    const name = stuNameEl.value?.trim();
    const email = stuEmailEl.value?.trim();
    const phone = stuPhoneEl?.value?.trim() || '';
    const gender = stuGenderEl?.value || '';
    const birthdate = stuBirthdateEl?.value || '';
    const classId = stuClassEl?.value;
    
    // Validation
    if (!name) {
      alert('Vui lòng nhập tên học sinh!');
      return;
    }
    if (!email) {
      alert('Vui lòng nhập email!');
      return;
    }
    if (!classId) {
      alert('Vui lòng chọn lớp!');
      return;
    }
    // Get class name
    let className = '';
    const classDoc = await db.collection('classes').doc(classId).get();
    if (classDoc.exists) {
      className = classDoc.data().name;
    } else {
      alert('Lớp học không tồn tại!');
      return;
    }

    // Upload photo if provided
    let photoUrl = null;
    if (window.currentPhotoFile) {
      photoUrl = await uploadToCloudinary(window.currentPhotoFile);
      if (!photoUrl) {
        alert('Lỗi upload ảnh. Vui lòng thử lại!');
        return;
      }
    }

    // Student data
    const studentData = {
      name: name,
      email: email,
      phone: phone || '',
      gender: gender || '',
      birthdate: birthdate || '',
      classId: classId,
      className: className,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    // Add photo if exists
    if (photoUrl) {
      studentData.photoUrl = photoUrl;
    }

    if (window.editingStudentId) {
      // Update existing student
      console.log('🔄 Updating student:', window.editingStudentId);
      await db.collection('students').doc(window.editingStudentId).update(studentData);
      
      // Log activity
      await db.collection('activity_logs').add({
        action: 'edit_student',
        details: `Cập nhật thông tin học sinh: ${name}`,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      alert('Cập nhật học sinh thành công!');
    } else {
      // Create new student
      console.log('➕ Creating new student:', name);
      studentData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      
      const newDoc = await db.collection('students').add(studentData);
      
      // Log activity
      await db.collection('activity_logs').add({
        action: 'add_student',
        details: `Thêm mới học sinh: ${name} (${className})`,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      // Update recent students
      try {
        const recentRef = db.collection('recent_data').doc('recent_students');
        const recentDoc = await recentRef.get();
        
        let recentStudents = [];
        if (recentDoc.exists) {
          recentStudents = recentDoc.data().students || [];
        }
        
        recentStudents.unshift({
          name: name,
          studentId: newDoc.id,
          addedAt: new Date().toISOString()
        });
        
        if (recentStudents.length > 20) {
          recentStudents = recentStudents.slice(0, 20);
        }
        
        await recentRef.set({
          students: recentStudents,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      } catch (err) {
        console.warn('⚠️ Could not update recent students:', err);
      }

      // 🎯 Gửi mã xác nhận qua email
      try {
        console.log('📧 Gửi mã xác nhận đến:', email);
        console.log('🌐 Gọi API: http://localhost:3000/send-verification-code');
        console.log('📍 Current location:', window.location.href);
        
        const requestBody = JSON.stringify({
          studentEmail: email,
          studentName: name
        });
        console.log('📤 Request body:', requestBody);
        
        const response = await fetch('http://localhost:3000/send-verification-code', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: requestBody
        });

        console.log('📬 Response status:', response.status);
        console.log('📬 Response headers:', response.headers);
        
        const result = await response.json();
        console.log('📬 Response body:', result);

        if (result.success && result.verificationCode) {
          // Lưu mã xác nhận vào Firestore
          console.log('💾 Lưu mã xác nhận vào Firestore:', result.verificationCode);
          await db.collection('students').doc(newDoc.id).update({
            verificationCode: result.verificationCode,
            verificationCodeCreatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });

          console.log('✅ Mã xác nhận đã gửi và lưu thành công');
          alert('✅ Thêm học sinh thành công!\n\n📧 Mã xác nhận: ' + result.verificationCode + '\n\nEmail: ' + email);
        } else {
          console.warn('⚠️ Không thể gửi mã xác nhận:', result.message);
          alert('✅ Thêm học sinh thành công!\n\n⚠️ Cảnh báo: ' + (result.message || 'Lỗi gửi email'));
        }
      } catch (err) {
        console.error('❌ Lỗi gửi email (catch):', err);
        console.error('Error name:', err.name);
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);
        alert('✅ Thêm học sinh thành công!\n\n⚠️ Không thể gửi email. Lỗi: ' + err.message);
      }
    }

    resetStudentForm();
    hideModal('student-modal');
    loadStudents();
    
  } catch (error) {
    console.error('❌ Error saving student:', error);
    console.error('Error stack:', error.stack);
    alert('❌ Lỗi lưu học sinh: ' + (error.message || JSON.stringify(error)));
  }
}

// Edit student
function editStudent(studentId, data) {
  console.log('✏️ Editing student:', studentId);
  
  try {
    window.editingStudentId = studentId;
    
    const title = document.getElementById('student-modal-title');
    if (title) title.textContent = 'Sửa học sinh';
    
    // Fill form safely
    const stuNameEl = document.getElementById('stu-name');
    const stuEmailEl = document.getElementById('stu-email');
    const stuPhoneEl = document.getElementById('stu-phone');
    const stuGenderEl = document.getElementById('stu-gender');
    const stuBirthdateEl = document.getElementById('stu-birthdate');
    const stuClassEl = document.getElementById('stu-class');
    
    if (stuNameEl) stuNameEl.value = data.name || '';
    if (stuEmailEl) stuEmailEl.value = data.email || '';
    if (stuPhoneEl) stuPhoneEl.value = data.phone || '';
    if (stuGenderEl) stuGenderEl.value = data.gender || '';
    if (stuBirthdateEl) stuBirthdateEl.value = data.birthdate || '';
    if (stuClassEl) stuClassEl.value = data.classId || '';
    
    showModal('student-modal');
  } catch (error) {
    console.error('❌ Error in editStudent:', error);
    alert('❌ Lỗi khi sửa học sinh: ' + error.message);
  }
}

// Delete student
function deleteStudent(studentId) {
  if (!confirm('Bạn có chắc muốn xóa học sinh này?')) {
    return;
  }

  console.log('🗑️ Deleting student:', studentId);

  // First get student data for logging
  db.collection('students').doc(studentId).get().then(doc => {
    if (doc.exists) {
      const studentData = doc.data();
      
      // Delete student
      db.collection('students').doc(studentId).delete()
        .then(() => {
          console.log('✅ Student deleted');
          
          // Log activity
          db.collection('activity_logs').add({
            action: 'delete_student',
            details: `Xóa học sinh: ${studentData.name} (${studentData.email})`,
            studentId: studentId,
            studentName: studentData.name,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
          });
          
          // Update statistics
          updateCount('totalStudents', -1);
          
          alert('Xóa học sinh thành công!');
          loadStudents();
        })
        .catch((error) => {
          console.error('❌ Error deleting student:', error);
          alert('Lỗi xóa học sinh: ' + error.message);
        });
    } else {
      console.error('❌ Student not found');
      alert('Không tìm thấy học sinh để xóa');
    }
  }).catch(err => {
    console.error('❌ Error fetching student:', err);
    alert('Lỗi lấy thông tin học sinh: ' + err.message);
  });
}

// Class management functions

function loadClassesList() {
  console.log('📋 Loading classes list');
  
  const classesListContainer = document.getElementById('classes-list-container');
  if (!classesListContainer) {
    console.warn('⚠️ classes-list-container not found');
    return;
  }

  classesListContainer.innerHTML = '<div class="loading">Đang tải...</div>';

  db.collection('classes')
    .get()
    .then((snapshot) => {
      console.log('✅ Classes loaded for list:', snapshot.size);
      classesListContainer.innerHTML = '';
      
      if (snapshot.empty) {
        classesListContainer.innerHTML = '<div class="no-data">Chưa có lớp học nào</div>';
        return;
      }

      // Sort by createdAt descending
      const docs = snapshot.docs.sort((a, b) => {
        const timeA = a.data().createdAt?.toMillis?.() || 0;
        const timeB = b.data().createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });
      
      docs.forEach((docSnap) => {
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

        // Add event listeners
        classesListContainer.querySelectorAll('.btn-edit').forEach(btn => {
          btn.addEventListener('click', (e) => {
            window.editingClassId = e.target.dataset.id;
            editClass(window.editingClassId);
          });
        });

        classesListContainer.querySelectorAll('.btn-delete').forEach(btn => {
          btn.addEventListener('click', (e) => {
            deleteClass(e.target.dataset.id);
          });
        });
    })
    .catch((error) => {
      console.error('❌ Error loading classes:', error);
      classesListContainer.innerHTML = `<div class="error">Lỗi tải: ${error.message}</div>`;
    });
}

function addClassHandler() {
  console.log('➕ Adding class');
  
  const name = document.getElementById('new-class-name')?.value.trim();
  const grade = document.getElementById('new-class-grade')?.value.trim();
  const teacher = document.getElementById('new-class-teacher')?.value.trim();

  if (!name) {
    alert('Vui lòng nhập tên lớp!');
    return;
  }

  const classData = {
    name: name,
    grade: grade || '',
    teacher: teacher || '',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  db.collection('classes').add(classData)
    .then(() => {
      console.log('✅ Class added');
      
      // Reset form
      document.getElementById('new-class-name').value = '';
      document.getElementById('new-class-grade').value = '';
      document.getElementById('new-class-teacher').value = '';
      
      alert('Thêm lớp thành công!');
      loadClasses();
      loadClassesList();
    })
    .catch((error) => {
      console.error('❌ Error adding class:', error);
      alert('Lỗi thêm lớp: ' + error.message);
    });
}

function editClass(classId) {
  console.log('✏️ Editing class:', classId);
  
  db.collection('classes').doc(classId).get()
    .then((docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        document.getElementById('new-class-name').value = data.name || '';
        document.getElementById('new-class-grade').value = data.grade || '';
        document.getElementById('new-class-teacher').value = data.teacher || '';
        
        const addBtn = document.getElementById('btn-add-class');
        addBtn.textContent = 'Cập nhật';
        addBtn.onclick = () => updateClassHandler(classId);
      }
    })
    .catch((error) => {
      console.error('❌ Error loading class:', error);
      alert('Lỗi tải thông tin lớp: ' + error.message);
    });
}

function updateClassHandler(classId) {
  console.log('🔄 Updating class:', classId);
  
  const name = document.getElementById('new-class-name')?.value.trim();
  const grade = document.getElementById('new-class-grade')?.value.trim();
  const teacher = document.getElementById('new-class-teacher')?.value.trim();

  if (!name) {
    alert('Vui lòng nhập tên lớp!');
    return;
  }

  const classData = {
    name: name,
    grade: grade || '',
    teacher: teacher || '',
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  db.collection('classes').doc(classId).update(classData)
    .then(() => {
      console.log('✅ Class updated');
      resetClassForm();
      alert('Cập nhật lớp thành công!');
      loadClasses();
      loadClassesList();
    })
    .catch((error) => {
      console.error('❌ Error updating class:', error);
      alert('Lỗi cập nhật lớp: ' + error.message);
    });
}

function deleteClass(classId) {
  if (!confirm('Bạn có chắc muốn xóa lớp này? Học sinh sẽ bị xóa khỏi lớp.')) {
    return;
  }

  console.log('🗑️ Deleting class:', classId);

  // Remove class reference from students
  db.collection('students')
    .where('classId', '==', classId)
    .get()
    .then((snapshot) => {
      const updates = snapshot.docs.map(doc => 
        db.collection('students').doc(doc.id).update({ 
          classId: '', 
          className: '' 
        })
      );
      return Promise.all(updates);
    })
    .then(() => {
      return db.collection('classes').doc(classId).delete();
    })
    .then(() => {
      console.log('✅ Class deleted');
      alert('Xóa lớp thành công!');
      loadClasses();
      loadClassesList();
    })
    .catch((error) => {
      console.error('❌ Error deleting class:', error);
      alert('Lỗi xóa lớp: ' + error.message);
    });
}

function resetClassForm() {
  document.getElementById('new-class-name').value = '';
  document.getElementById('new-class-grade').value = '';
  document.getElementById('new-class-teacher').value = '';
  
  const addBtn = document.getElementById('btn-add-class');
  if (addBtn) {
    addBtn.textContent = 'Thêm lớp';
    addBtn.onclick = addClassHandler;
  }
  
  window.editingClassId = null;
}

function saveQuickClassHandler() {
  console.log('💾 Saving quick class');
  
  const name = document.getElementById('quick-class-name')?.value.trim();
  const grade = document.getElementById('quick-class-grade')?.value.trim();

  if (!name) {
    alert('Vui lòng nhập tên lớp!');
    return;
  }

  const classData = {
    name: name,
    grade: grade || '',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  db.collection('classes').add(classData)
    .then(() => {
      console.log('✅ Quick class added');
      hideModal('quick-class-modal');
      document.getElementById('quick-class-name').value = '';
      document.getElementById('quick-class-grade').value = '';
      alert('Thêm lớp thành công!');
      loadClasses();
      loadClassesList();
    })
    .catch((error) => {
      console.error('❌ Error adding quick class:', error);
      alert('Lỗi thêm lớp: ' + error.message);
    });
}

// Utility functions

function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
  }
}

function hideModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
  }
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
