// User Management JavaScript

let users = [];
let userModal;
let isEditMode = false;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    userModal = new bootstrap.Modal(document.getElementById('userModal'));
    loadUsers();
    loadUserStats();
    
    // Setup form submission
    document.getElementById('userForm').addEventListener('submit', handleUserSubmit);
});

// Load all users
async function loadUsers() {
    try {
        showLoading(true);
        const response = await fetch('/api/users');
        
        if (!response.ok) {
            throw new Error('Errore nel caricamento utenti');
        }
        
        users = await response.json();
        renderUsersTable();
    } catch (error) {
        console.error('Errore:', error);
        showAlert('Errore nel caricamento degli utenti', 'danger');
    } finally {
        showLoading(false);
    }
}

// Load user statistics
async function loadUserStats() {
    try {
        const response = await fetch('/api/users/stats');
        
        if (!response.ok) {
            throw new Error('Errore nel caricamento statistiche');
        }
        
        const stats = await response.json();
        updateStatsDisplay(stats);
    } catch (error) {
        console.error('Errore statistiche:', error);
    }
}

// Update statistics display
function updateStatsDisplay(stats) {
    // Supporta sia la vecchia che la nuova struttura
    const totalUsers = stats.totalUsers ?? stats.total ?? 0;
    const activeUsers = stats.activeUsers ?? stats.active ?? 0;
    const admins = stats.admins ?? stats.roles?.admin ?? 0;
    const operators = stats.operators ?? stats.roles?.operator ?? 0;
    const viewers = stats.viewers ?? stats.roles?.viewer ?? 0;

    document.getElementById('totalUsers').textContent = totalUsers;
    document.getElementById('activeUsers').textContent = activeUsers;
    document.getElementById('admins').textContent = admins;
    document.getElementById('operators').textContent = operators;
    document.getElementById('viewers').textContent = viewers;
}

// Render users table
function renderUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    
    if (users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4">
                    <i class="bi bi-people text-muted" style="font-size: 2rem;"></i>
                    <div class="mt-2 text-muted">Nessun utente trovato</div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>
                <div class="d-flex align-items-center">
                    <div class="user-avatar bg-${getRoleColor(user.role)} text-white">
                        ${user.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div class="fw-semibold">${escapeHtml(user.username)}</div>
                        <div class="small text-muted">ID: ${user._id.slice(-8)}</div>
                    </div>
                </div>
            </td>
            <td>
                <span class="text-break">${escapeHtml(user.email || 'Non specificata')}</span>
            </td>
            <td>
                <span class="badge bg-${getRoleColor(user.role)} badge-role">
                    ${getRoleLabel(user.role)}
                </span>
            </td>
            <td>
                <span class="status-${user.isActive ? 'active' : 'inactive'}">
                    <i class="bi bi-circle-fill me-1" style="font-size: 0.7rem;"></i>
                    ${user.isActive ? 'Attivo' : 'Inattivo'}
                </span>
            </td>
            <td>
                <span class="small">
                    ${user.lastLogin ? formatDate(user.lastLogin) : 'Mai'}
                </span>
            </td>
            <td>
                <span class="small">${formatDate(user.createdAt)}</span>
            </td>
            <td>
                <div class="btn-group btn-group-sm" role="group">
                    <button class="btn btn-outline-primary" onclick="editUser('${user._id}')" title="Modifica">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-${user.isActive ? 'warning' : 'success'}" 
                            onclick="toggleUserStatus('${user._id}')" 
                            title="${user.isActive ? 'Disattiva' : 'Attiva'}">
                        <i class="bi bi-${user.isActive ? 'pause' : 'play'}"></i>
                    </button>
                    <button class="btn btn-outline-danger" onclick="deleteUser('${user._id}')" title="Elimina">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Show create user modal
function showCreateUserModal() {
    isEditMode = false;
    document.getElementById('userModalTitle').textContent = 'Nuovo Utente';
    document.getElementById('userForm').reset();
    document.getElementById('userId').value = '';
    document.getElementById('password').required = true;
    document.getElementById('passwordHelp').style.display = 'none';
    document.getElementById('saveUserBtn').textContent = 'Crea Utente';
    userModal.show();
}

// Edit user
function editUser(userId) {
    const user = users.find(u => u._id === userId);
    if (!user) return;
    
    isEditMode = true;
    document.getElementById('userModalTitle').textContent = 'Modifica Utente';
    document.getElementById('userId').value = user._id;
    document.getElementById('username').value = user.username;
    document.getElementById('email').value = user.email || '';
    document.getElementById('password').value = '';
    document.getElementById('password').required = false;
    document.getElementById('role').value = user.role;
    document.getElementById('isActive').checked = user.isActive;
    document.getElementById('passwordHelp').style.display = 'block';
    document.getElementById('saveUserBtn').textContent = 'Salva Modifiche';
    userModal.show();
}

// Handle form submission
async function handleUserSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const userData = {
        username: formData.get('username'),
        email: formData.get('email'),
        role: formData.get('role'),
        isActive: formData.get('isActive') === 'on'
    };
    
    // Add password only if provided
    const password = formData.get('password');
    if (password) {
        userData.password = password;
    }
    
    try {
        showLoading(true);
        
        let response;
        if (isEditMode) {
            const userId = formData.get('userId');
            response = await fetch(`/api/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
            });
        } else {
            response = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
            });
        }
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Errore nel salvataggio');
        }
        
        userModal.hide();
        showAlert(`Utente ${isEditMode ? 'modificato' : 'creato'} con successo`, 'success');
        await loadUsers();
        await loadUserStats();
        
    } catch (error) {
        console.error('Errore:', error);
        showAlert(error.message, 'danger');
    } finally {
        showLoading(false);
    }
}

// Toggle user status
async function toggleUserStatus(userId) {
    const user = users.find(u => u._id === userId);
    if (!user) return;
    
    const action = user.isActive ? 'disattivare' : 'attivare';
    
    if (!confirm(`Sei sicuro di voler ${action} l'utente "${user.username}"?`)) {
        return;
    }
    
    try {
        showLoading(true);
        
        const response = await fetch(`/api/users/${userId}/toggle-status`, {
            method: 'PUT'
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Errore nel cambio stato');
        }
        
        showAlert(`Utente ${user.isActive ? 'disattivato' : 'attivato'} con successo`, 'success');
        await loadUsers();
        await loadUserStats();
        
    } catch (error) {
        console.error('Errore:', error);
        showAlert(error.message, 'danger');
    } finally {
        showLoading(false);
    }
}

// Delete user
async function deleteUser(userId) {
    const user = users.find(u => u._id === userId);
    if (!user) return;
    
    if (!confirm(`Sei sicuro di voler eliminare l'utente "${user.username}"?\n\nQuesta azione è irreversibile.`)) {
        return;
    }
    
    try {
        showLoading(true);
        
        const response = await fetch(`/api/users/${userId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Errore nell\'eliminazione');
        }
        
        showAlert('Utente eliminato con successo', 'success');
        await loadUsers();
        await loadUserStats();
        
    } catch (error) {
        console.error('Errore:', error);
        showAlert(error.message, 'danger');
    } finally {
        showLoading(false);
    }
}

// Utility functions
function getRoleColor(role) {
    switch (role) {
        case 'admin': return 'danger';
        case 'operator': return 'warning';
        case 'viewer': return 'info';
        default: return 'secondary';
    }
}

function getRoleLabel(role) {
    switch (role) {
        case 'admin': return 'Amministratore';
        case 'operator': return 'Operatore';
        case 'viewer': return 'Visualizzatore';
        default: return role;
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    if (show) {
        spinner.classList.remove('d-none');
    } else {
        spinner.classList.add('d-none');
    }
}

function showAlert(message, type) {
    // Create alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}
