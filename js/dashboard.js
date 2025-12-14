// Dashboard functionality
document.addEventListener('DOMContentLoaded', function() {
  if (!auth.currentUser) return;

  // Load statistics
  loadStatistics();
  loadRecentData();

  function loadStatistics() {
    // Count classes
    db.collection('classes').get().then(snapshot => {
      document.getElementById('total-classes').textContent = snapshot.size;
    });

    // Count students
    db.collection('students').get().then(snapshot => {
      document.getElementById('total-students').textContent = snapshot.size;
    });

    // Count recent activities (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    db.collection('students')
      .where('createdAt', '>=', weekAgo)
      .get()
      .then(snapshot => {
        document.getElementById('recent-activities').textContent = snapshot.size;
      });
  }

  function loadRecentData() {
    // Load recent classes
    db.collection('classes')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get()
      .then(snapshot => {
        const container = document.getElementById('recent-classes');
        container.innerHTML = '';
        
        snapshot.forEach(doc => {
          const data = doc.data();
          const item = document.createElement('div');
          item.className = 'content-list-item glass';
          item.innerHTML = `
            <span>${data.name}</span>
            <small>${data.grade || ''}</small>
          `;
          container.appendChild(item);
        });
      });

    // Load recent students
    db.collection('students')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get()
      .then(snapshot => {
        const container = document.getElementById('recent-students');
        container.innerHTML = '';
        
        snapshot.forEach(doc => {
          const data = doc.data();
          const item = document.createElement('div');
          item.className = 'content-list-item glass';
          item.innerHTML = `
            <span>${data.name}</span>
            <small>${data.className || ''}</small>
          `;
          container.appendChild(item);
        });
      });
  }
});