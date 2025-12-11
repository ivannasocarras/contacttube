const urlBase = 'https://contacttube.me/LAMPAPI';
const extension = 'php';

// Global variables to hold user state
let userId = 0;
let firstName = "";
let lastName = "";
let isEditMode = false; 
let allContacts = [];      // Holds the full list of contacts from the API
let currentPage = 1;       // Page currently viewed
const contactsPerPage = 20; // Contacts per page


// --------------------------------------------------------------------------------
// Section 1: Core Functions (Login, Register, Logout)
// --------------------------------------------------------------------------------

// ---------- DO LOGIN ----------
async function doLogin() {
    let login = document.getElementById("loginName").value;
    let password = document.getElementById("loginPassword").value;
    let resultElement = document.getElementById("loginResult");
    resultElement.innerHTML = ""; // Clear previous results

    // 1. Validate input first
    if (!login) return resultElement.innerHTML = "Username is required!";
    if (!password) return resultElement.innerHTML = "Password is required!";
    
    // 2. Send data to the API using our new helper function
    const payload = { login: login, password: password };
    const response = await sendRequest('/Login', payload);

    // 3. Handle the response
    if (response && response.id > 0) {
        // Success
        firstName = response.firstName;
        lastName = response.lastName;
        userId = response.id;
        saveCookies();
        window.location.href = "color.html";
    } else {
        // Failure
        resultElement.innerHTML = "User/Password combination incorrect.";
    }
}

// ---------- DO REGISTER ----------
async function doRegister() {
    // 1. Get all the values from the form
    const firstName = document.getElementById("registerFirstName").value;
    const lastName = document.getElementById("registerLastName").value;
    const login = document.getElementById("loginName").value;
    const password = document.getElementById("loginPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const resultElement = document.getElementById("loginResult");
    resultElement.innerHTML = "";

    // 2. Perform all validation checks in order
    if (!firstName || !lastName || !login || !password) {
        resultElement.innerHTML = "All fields except phone/email are required.";
        return;
    }

    // Check #1: Password Pattern
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSymbol = /[!@#$%^&*]/.test(password);
    const isLongEnough = password.length >= 8;

    if (!isLongEnough || !hasUpperCase || !hasNumber || !hasSymbol) {
        resultElement.innerHTML = "Password does not meet all requirements.";
        return; // Stop the function
    }
    
    // Check #2: Passwords Match
    if (password !== confirmPassword) {
        resultElement.innerHTML = "Passwords do not match.";
        return; // Stop the function
    }

    // 3. If all checks pass, send the data to the API
    const payload = { 
        firstName: capitalizeFirstLetter(firstName), 
        lastName: capitalizeFirstLetter(lastName), 
        login: login, 
        password: password 
    };
    const response = await sendRequest('/Register', payload, 'register');

    // 4. Handle the API response
    if (response && response.id > 0) {
        resultElement.innerHTML = "Registration successful! Please sign in.";
    } else if (response === 409) {
        resultElement.innerHTML = "Username is already taken.";
    } else {
        resultElement.innerHTML = "Registration failed. Please try again.";
    }
}

// ---------- DO LOGOUT ----------
function doLogout() {
    userId = 0;
    firstName = "";
    lastName = "";
    // Delete each cookie individually
    document.cookie = "firstName=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    document.cookie = "lastName=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    document.cookie = "userId=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    window.location.href = "index.html";
}


// --------------------------------------------------------------------------------
// Section 2: Cookie Management (Corrected)
// --------------------------------------------------------------------------------

function saveCookies() {
    let minutes = 20;
    let date = new Date();
    date.setTime(date.getTime() + (minutes * 60 * 1000));
    const expires = "expires=" + date.toUTCString();

    // **CORRECT WAY:** Set each cookie as a separate key-value pair.
    document.cookie = `firstName=${firstName};${expires};path=/`;
    document.cookie = `lastName=${lastName};${expires};path=/`;
    document.cookie = `userId=${userId};${expires};path=/`;
}

function readCookie() {
    userId = -1;
    firstName = "";
    lastName = "";

    // **CORRECT WAY:** Split the cookie string by semicolons.
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
        let cookie = cookies[i].trim();
        let [name, value] = cookie.split('='); // Split into name and value
        
        if (name === "firstName") firstName = value;
        if (name === "lastName") lastName = value;
        if (name === "userId") userId = parseInt(value);
    }

    // Guard to protect the page
    if (userId < 0) {
        window.location.href = "index.html";
    } else {
        // Optional: Display the user's name on the page
        // const userNameElement = document.getElementById("userName");
        // if (userNameElement) {
        //     userNameElement.innerHTML = `Logged in as ${firstName} ${lastName}`;
        // }
        loadContacts();
    }
}


// --------------------------------------------------------------------------------
// Section 3: Functions 
// --------------------------------------------------------------------------------

async function sendRequest(endpoint, payload, flag = '') {
    const url = `${urlBase}${endpoint}.${extension}`;
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=UTF-8' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            // STEP 1: Get the server's response as plain text first.
            const responseText = await response.text();
            
            const repairedText = responseText.replace(/,}/g, '}');
            
            // STEP 3: Now, parse the repaired text into a JSON object.
            return JSON.parse(repairedText);

        } else if (flag === 'register' && response.status === 409) {
            return 409;
        } else {
            console.error(`Request failed with status: ${response.status}`);
            return null;
        }
    } catch (error) {
        console.error("Network error:", error);
        return null;
    }
}

// --------------------------------------------------------------------------------
// Section 3.1: Main Contacts Page
// --------------------------------------------------------------------------------

// ---------- SHOW ADD CONTACT FORM ----------
function showAddContactForm() {
    const modal = document.getElementById('addContactModal');
    modal.style.display = 'flex'; 
}

// ---------- HIDE ADD CONTACT FORM ----------
function hideAddContactForm() {
    const modal = document.getElementById('addContactModal');
    modal.style.display = 'none';

    // Clear the form fields and any error messages when closing
    document.getElementById('addContactForm').reset();
    document.getElementById('addContactResult').innerHTML = '';
}

// ---------- CREATE CONTACT ----------
async function addContact() {
    // Get values from the form
    let firstName = document.getElementById("contactFirstName").value;
    let lastName = document.getElementById("contactLastName").value;
    let email = document.getElementById("contactEmail").value;
    let phone = document.getElementById("contactPhone").value;
    let resultElement = document.getElementById("addContactResult");

    if (userId <= 0) {
        resultElement.innerHTML = "ERROR: Not logged in. Please refresh the page and try again.";
        return; // Stop the function
    }

    // Simple validation
    if (!firstName || !lastName) {
        resultElement.innerHTML = "First and last name are required.";
        return;
    }
    
    // Create the payload and send to API
    const payload = { 
        firstName: firstName, 
        lastName: lastName, 
        email: email, 
        phone: phone, 
        userId: userId 
    };
    const response = await sendRequest('/AddContact', payload); 

    // Handle response
    if (response) {
        hideAddContactForm();
        loadContacts(); // Refresh the contact list to show the new one
    } else {
        resultElement.innerHTML = "Failed to add contact. Please try again.";
    }
}

// ---------- LOAD CONTACT ----------
async function loadContacts(shouldFetch = true) {
    const tableBody = document.getElementById('contactsTableBody');
    const tableHeadRow = document.querySelector('.contacts-table thead tr');
    
    if (shouldFetch) {
        const searchInput = document.getElementById('headerSearchInput');
        const searchTerm = searchInput.value;
        const payload = { search: searchTerm, userId: userId };
        const response = await sendRequest('/SearchContact', payload);
        allContacts = response.results || [];
        currentPage = 1; 
    }
    
    const totalPages = Math.ceil(allContacts.length / contactsPerPage);
    if (currentPage > totalPages) {
        currentPage = 1;
    }
    if (currentPage < 1) {
        currentPage = 1;
    }

    const startIndex = (currentPage - 1) * contactsPerPage;
    const endIndex = startIndex + contactsPerPage;
    const contactsToShow = allContacts.slice(startIndex, endIndex);

    let tableHTML = '';
    if (contactsToShow.length > 0) {
        contactsToShow.forEach(contact => {
            let actionsCell = isEditMode ? `
                <td class="action-buttons">
                    <button class="icon-button" onclick="openEditModal('${contact.id}', '${contact.firstName}', '${contact.lastName}', '${contact.email}', '${contact.phone}')"><i class="fas fa-pencil-alt"></i></button>
                    <button class="icon-button" onclick="deleteContact(${contact.id})"><i class="fas fa-trash"></i></button>
                </td>` : '';
            tableHTML += `
                <tr>
                    <td>${capitalizeFirstLetter(contact.firstName)}</td>
                    <td>${capitalizeFirstLetter(contact.lastName)}</td>
                    <td>${contact.email}</td>
                    <td>${formatPhoneNumber(contact.phone)}</td>
                    ${actionsCell}
                </tr>
            `;
        });
    } else {
        const colspan = isEditMode ? 5 : 4;
        tableHTML = `<tr><td colspan="${colspan}">No contacts found.</td></tr>`;
    }
    tableBody.innerHTML = tableHTML;
    
    renderPagination(allContacts.length);
}

// ---------- SEARCH CONTACT ----------
async function searchContact(){
        let search = document.getElementById("contactSearch").value;
        const payload = {
                userId: userId,
                search: search
        }
        const response = await sendRequest('/SearchContact', payload);
        console.log(response);


}

// ---------- DELETE CONTACT ----------
async function deleteContact(contactId) {
    console.log("Attempting to delete contact with this ID:", contactId);

    if (!confirm('Are you sure you want to delete this contact?')) {
        return;
    }

    const payload = { id: parseInt(contactId), userId: parseInt(userId) };

    const response = await sendRequest('/DeleteContact', payload);

    if (response && response.error === "") {
        loadContacts(); // Refresh the contact list
    } else {
        alert("Failed to delete contact.");
    }
}

// ---------- EDIT CONTACT ----------
function openEditModal(id, firstName, lastName, email, phone) {
    // Populate the form fields with the contact's current data
    document.getElementById('editContactId').value = id;
    document.getElementById('editFirstName').value = firstName;
    document.getElementById('editLastName').value = lastName;
    document.getElementById('editEmail').value = email;
    document.getElementById('editPhone').value = phone;

    // Show the modal
    document.getElementById('editContactModal').style.display = 'flex';
}

function hideEditModal() {
    document.getElementById('editContactModal').style.display = 'none';
    document.getElementById('editContactResult').innerHTML = '';
}


// ---------- UPDATE CONTACT AFTER EDIT  ----------
async function updateContact() {
    let resultElement = document.getElementById("editContactResult");

    // Get the updated values from the edit form
    let contactId = document.getElementById('editContactId').value;
    let firstName = document.getElementById('editFirstName').value;
    let lastName = document.getElementById('editLastName').value;
    let email = document.getElementById('editEmail').value;
    let phone = document.getElementById('editPhone').value;

    if (!firstName || !lastName) {
        resultElement.innerHTML = "First and last name are required.";
        return;
    }

    // Convert the string IDs to integers before sending
    const payload = {
        id: parseInt(contactId),
        firstName: firstName,
        lastName: lastName,
        email: email,
        phone: phone,
        userId: parseInt(userId) 
    };

    const response = await sendRequest('/UpdateContact', payload);

    if (response && response.error === "") {
        hideEditModal();
        loadContacts(); // Refresh the contact list
    } else {
        resultElement.innerHTML = "Failed to update contact.";
    }
}

function toggleEditMode() {
    // Flip the boolean value (true becomes false, false becomes true)
    isEditMode = !isEditMode;

    // Reload the contacts to update the view
    loadContacts();

    // Change the button text
    const editButton = document.getElementById('mainEditButton'); 
    if (isEditMode) {
        editButton.textContent = 'Done';
        editButton.classList.add('active-edit'); 
    } else {
        editButton.textContent = 'Edit / Delete';
        editButton.classList.remove('active-edit');
    }
}

// ---------- CHANGE PAGE ----------
function changePage(direction) {
    currentPage += direction;
    loadContacts(false); 
}

function renderPagination(totalContacts) {
    console.log('--- renderPagination called ---');
    console.log('Total contacts received:', totalContacts);
    
    const pageInfo = document.getElementById('pageInfo');
    const prevButton = document.getElementById('prevPageButton');
    const nextButton = document.getElementById('nextPageButton');
    
    const totalPages = Math.ceil(totalContacts / contactsPerPage);
    console.log('Calculated totalPages:', totalPages);
    console.log('Current page is:', currentPage);

    if (totalPages > 0) {
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        prevButton.disabled = currentPage === 1;
        nextButton.disabled = currentPage === totalPages;
    } else {
        pageInfo.textContent = 'Page 1 of 1';
        prevButton.disabled = true;
        nextButton.disabled = true;
    }
    console.log('Is "Next" button disabled?', nextButton.disabled);
}

// ---------- FORMAT PHONE NUMBER ----------
function formatPhoneNumber(phoneNumberString) {
  // 1. Remove all non-digit characters from the string.
  const cleaned = ('' + phoneNumberString).replace(/\D/g, '');
  
  // 2. Use a regular expression to match and capture the number parts.
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  
  // 3. If it's a valid 10-digit number, reformat it.
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  
  // 4. If it's not a 10-digit number, return it as is.
  return phoneNumberString;
}

// ---------- CAPITALIZE FIRST LETTER OF NAME ----------
function capitalizeFirstLetter(string) {
  // Return an empty string if the input is empty or invalid
  if (!string) return '';
  
  // Take the first character, make it uppercase, and add the rest of the string
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// ---------- SORT CONTACTS ----------
function sortAndDisplayContacts() {
    const sortBy = document.getElementById('sortContacts').value;

    allContacts.sort((a, b) => {
        if (sortBy === 'az') {
            return a.firstName.localeCompare(b.firstName);
        } else if (sortBy === 'za') {
            return b.firstName.localeCompare(a.firstName);
        } else if (sortBy === 'newest') {
            return new Date(b.date) - new Date(a.date);
        }
        return 0;
    });

    currentPage = 1;
    loadContacts(false); // Use 'false' here as well.
}

// ---------- SWICTH BETWEEN CONTACTS AND ABOUT US PAGES ----------
function showView(viewName) {
    // Get references to the HTML elements
    const contactsView = document.getElementById('contactsView');
    const aboutView = document.getElementById('aboutView');
    const contactsTab = document.getElementById('contactsTab');
    const aboutTab = document.getElementById('aboutTab');
    
    // Use an if/else statement to show correct view
    if (viewName === 'contacts') {
        contactsView.style.display = 'block'; // Show contacts
        aboutView.style.display = 'none';    // Hide about us
        
        contactsTab.classList.add('active'); // Set 'Contacts' tab to active
        aboutTab.classList.remove('active');
        
    } else if (viewName === 'about') {
        contactsView.style.display = 'none';    // Hide contacts
        aboutView.style.display = 'block'; // Show about us
        
        contactsTab.classList.remove('active');
        aboutTab.classList.add('active'); // Set 'About Us' tab to active
    }
}

// --------------------------------------------------------------------------------
// Section 3.2: Sign-up Page
// --------------------------------------------------------------------------------

// ---------- LOGIN SCREEN HELP MESSAGE----------
function showHelpMessage() {
    alert("Whoops! Account recovery is not an implemented feature for this project.");
}

// A small helper function to reduce repetition
function validateRequirement(element, isValid) {
    if (element) {
        if (isValid) {
            element.classList.remove('invalid');
            element.classList.add('valid');
        } else {
            element.classList.remove('valid');
            element.classList.add('invalid');
        }
    }
}

// ---------- CHECK IF PASSWORD MEETS CRITERIA AND IF PASSWORDS MATCH ----------
document.addEventListener('DOMContentLoaded', function() {

    const passwordInput = document.getElementById('loginPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const checklist = document.getElementById('password-checklist');
    const matchCheck = document.getElementById('match-check');

    if (!passwordInput) return; // Exit if password field isn't on the page

    const lengthCheck = document.getElementById('length-check');
    const upperCheck = document.getElementById('upper-check');
    const numberCheck = document.getElementById('number-check');
    const symbolCheck = document.getElementById('symbol-check');

    passwordInput.addEventListener('focus', () => { if (checklist) checklist.style.display = 'block'; });
    passwordInput.addEventListener('blur', () => { if (checklist) checklist.style.display = 'none'; });
    passwordInput.addEventListener('keyup', () => {
        const password = passwordInput.value;
        validateRequirement(lengthCheck, password.length >= 8);
        validateRequirement(upperCheck, /[A-Z]/.test(password));
        validateRequirement(numberCheck, /\d/.test(password)); // <-- This line is now fixed
        validateRequirement(symbolCheck, /[!@#$%^&*]/.test(password));
        
        // Also check the confirmation field if it exists
        if (confirmPasswordInput) {
            validateMatch();
        }
    });

    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('focus', () => { if (matchCheck) matchCheck.style.display = 'block'; });
        confirmPasswordInput.addEventListener('blur', () => { if (matchCheck) matchCheck.style.display = 'none'; });
        confirmPasswordInput.addEventListener('keyup', validateMatch);
    }

    function validateMatch() {
        if (matchCheck) {
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;
            validateRequirement(matchCheck, password === confirmPassword && confirmPassword !== '');
        }
    }
});
