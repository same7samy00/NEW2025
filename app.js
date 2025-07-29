// app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, addDoc, updateDoc, deleteDoc, query, where, orderBy, getDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
// No longer importing storage as image upload is removed
// import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js";
import { auth, checkAuthStateAndRedirect, signOutUser } from './auth.js'; // Import auth and check function

// Your web app's Firebase configuration - REPLACE WITH YOUR ACTUAL CONFIG
const firebaseConfig = {
    apiKey: "AIzaSyC9eufzO00_JtbdVoDrw-bJfF1PY3meYoE",
    authDomain: "new2025-d2fba.firebaseapp.com",
    projectId: "new2025-d2fba",
    storageBucket: "new2025-d2fba.firebasestorage.app", // Still needed even if not used directly
    messagingSenderId: "239931222059",
    appId: "1:239931222059:web:6275e5aa6577fb14f4e26e",
    measurementId: "G-3F4TJ0K34J"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
// const storage = getStorage(app); // No longer needed as image upload is removed

// --- Custom Alert/Notification Function ---
// This function needs to be defined outside any specific page logic
// so it's available for auth.js and other parts of app.js.
export function showCustomAlert(message, type = 'success') {
    const alertContainer = document.getElementById('customAlertContainer');
    if (!alertContainer) return; // Ensure the container exists

    const alertDiv = document.createElement('div');
    alertDiv.classList.add('custom-alert');
    if (type === 'error') {
        alertDiv.classList.add('error');
    }

    const iconClass = type === 'success' ? 'fas fa-check-circle' : 'fas fa-times-circle';
    alertDiv.innerHTML = `<i class="${iconClass}"></i><span>${message}</span>`;

    alertContainer.prepend(alertDiv); // Add to top

    setTimeout(() => {
        alertDiv.remove();
    }, 3000); // Remove after 3 seconds
}

// --- Global DOM Elements for Dashboard & Product Form ---
const productsTableBody = document.getElementById('productsTableBody');
const noProductsMessage = document.getElementById('noProductsMessage');
const loadingSpinner = document.getElementById('loadingSpinner');
const searchInput = document.getElementById('searchInput');
const filterCategory = document.getElementById('filterCategory');
const addProductBtn = document.getElementById('addProductBtn');
const scanSearchBarcodeBtn = document.getElementById('scanSearchBarcodeBtn'); // New button for search scan

// Modals
const scannerModal = document.getElementById('scannerModal');
const closeScannerBtn = document.getElementById('closeScanner');
const interactiveViewport = document.getElementById('interactive');
const scannerResults = document.getElementById('scannerResults');
const printBarcodeModal = document.getElementById('printBarcodeModal');
const closePrintBarcodeBtn = document.getElementById('closePrintBarcode');
const barcodeToPrintDiv = document.getElementById('barcodeToPrint');

// Product Form elements (used in product-form.html)
const productForm = document.getElementById('productForm');
const productIdInput = document.getElementById('productId');
const tradeNameInput = document.getElementById('tradeName');
const scientificNameInput = document.getElementById('scientificName');
const concentrationInput = document.getElementById('concentration');
const pharmaceuticalFormInput = document.getElementById('pharmaceuticalForm');
const quantityInput = document.getElementById('quantity');
const purchasePriceInput = document.getElementById('purchasePrice');
const salePriceInput = document.getElementById('salePrice');
const unitTypeInput = document.getElementById('unitType');
const subUnitsInput = document.getElementById('subUnits');
const subSubUnitsInput = document.getElementById('subSubUnits');
const productionDateInput = document.getElementById('productionDate');
const expiryDateInput = document.getElementById('expiryDate');
const barcodeInput = document.getElementById('barcodeInput');
const scanBarcodeBtn = document.getElementById('scanBarcodeBtn'); // For form barcode scan
const generateBarcodeBtn = document.getElementById('generateBarcodeBtn');
const generatedBarcodeSvg = document.getElementById('generatedBarcode');
const supplierInput = document.getElementById('supplier');
const minStockInput = document.getElementById('minStock');
const formErrorMessage = document.getElementById('formErrorMessage');
const formPageTitle = document.getElementById('formPageTitle'); // Title for product-form.html


let allProductsData = []; // Store all products for client-side search/filter

// --- Dashboard Page Logic ---
if (window.location.pathname.includes('dashboard.html')) {
    checkAuthStateAndRedirect(); // Check if user is logged in

    // Sidebar Toggle
    const sidebar = document.getElementById('sidebar');
    const menuToggleBtn = document.getElementById('menuToggleBtn');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');

    if (menuToggleBtn) {
        menuToggleBtn.addEventListener('click', () => {
            sidebar.classList.add('open');
        });
    }

    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener('click', () => {
            sidebar.classList.remove('open');
        });
    }

    // Load products on dashboard load (after auth check)
    auth.onAuthStateChanged(user => {
        if (user) {
            loadProducts();
        }
    });

    // Add Product button redirects to product-form.html
    if (addProductBtn) {
        addProductBtn.addEventListener('click', () => {
            window.location.href = 'product-form.html';
        });
    }

    // Search input event listener
    if (searchInput) {
        searchInput.addEventListener('input', applySearchAndFilter);
    }

    // Filter select event listener
    if (filterCategory) {
        filterCategory.addEventListener('change', applySearchAndFilter);
    }

    // Scan for Search Barcode button
    if (scanSearchBarcodeBtn) {
        scanSearchBarcodeBtn.addEventListener('click', () => {
            scannerResults.textContent = 'جاري البحث عن باركود...';
            scannerModal.style.display = 'flex';
            initBarcodeScanner(true); // Pass true to indicate it's for search
        });
    }

    // Function to calculate remaining days to expiry
    function getDaysUntilExpiry(expiryDateStr) {
        if (!expiryDateStr) return null;
        const expiry = new Date(expiryDateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time for accurate day calculation
        const diffTime = expiry.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }

    // Load Products from Firestore
    async function loadProducts() {
        productsTableBody.innerHTML = '';
        noProductsMessage.style.display = 'none';
        loadingSpinner.style.display = 'block';
        allProductsData = []; // Clear previous data

        let productsRef = collection(db, 'products');
        let q = query(productsRef, orderBy('lastUpdated', 'desc'));

        try {
            const productSnapshot = await getDocs(q);

            if (productSnapshot.empty) {
                noProductsMessage.style.display = 'block';
                loadingSpinner.style.display = 'none';
                return;
            }

            productSnapshot.forEach(doc => {
                allProductsData.push({ id: doc.id, ...doc.data() });
            });

            applySearchAndFilter(); // Apply current search/filter after loading

        } catch (error) {
            console.error("Error loading products:", error);
            productsTableBody.innerHTML = `<tr><td colspan="5" class="error-message-cell">حدث خطأ أثناء تحميل المنتجات. يرجى إعادة المحاولة.</td></tr>`;
            showCustomAlert('حدث خطأ أثناء تحميل المنتجات.', 'error');
        } finally {
            loadingSpinner.style.display = 'none';
        }
    }

    // Apply Search and Filter
    function applySearchAndFilter() {
        const searchTerm = searchInput.value.toLowerCase();
        const filter = filterCategory.value;

        const filteredProducts = allProductsData.filter(product => {
            const searchMatch = searchTerm ?
                (product.tradeName && product.tradeName.toLowerCase().includes(searchTerm)) ||
                (product.scientificName && product.scientificName.toLowerCase().includes(searchTerm)) ||
                (product.barcode && product.barcode.includes(searchTerm))
                : true;

            let filterMatch = true;
            const days = getDaysUntilExpiry(product.expiryDate);

            if (filter === 'قريب من الانتهاء') {
                filterMatch = days !== null && days <= 90 && days > 0;
            } else if (filter === 'منتهي الصلاحية') {
                filterMatch = days !== null && days <= 0;
            } else if (filter === 'منخفض المخزون') {
                filterMatch = product.quantity !== undefined && product.minStock !== undefined && product.quantity <= product.minStock;
            }
            return searchMatch && filterMatch;
        });

        if (filteredProducts.length === 0) {
            noProductsMessage.style.display = 'block';
            productsTableBody.innerHTML = ''; // Clear table if no results
        } else {
            noProductsMessage.style.display = 'none';
            displayProducts(filteredProducts);
        }
    }

    // Display Products in Table
    function displayProducts(products) {
        productsTableBody.innerHTML = '';
        products.forEach(product => {
            const row = productsTableBody.insertRow();
            row.dataset.id = product.id;

            const daysUntilExpiry = getDaysUntilExpiry(product.expiryDate);
            if (daysUntilExpiry !== null) {
                if (daysUntilExpiry <= 0) {
                    row.classList.add('expired-product');
                } else if (daysUntilExpiry <= 90) {
                    row.classList.add('expiring-soon');
                }
            }
            if (product.quantity !== undefined && product.minStock !== undefined && product.quantity <= product.minStock) {
                row.classList.add('low-stock');
            }

            // Columns displayed on dashboard (optimized for mobile)
            row.insertCell().textContent = product.tradeName || '';
            row.insertCell().textContent = product.quantity !== undefined ? `${product.quantity} ${product.unitType || 'علبة'}` : '';
            row.insertCell().textContent = product.salePrice !== undefined ? `${product.salePrice.toFixed(2)} EGP` : '';
            row.insertCell().textContent = product.expiryDate || '';
            // Barcode (full text on desktop, shortened on mobile)
            const barcodeCell = row.insertCell();
            barcodeCell.textContent = product.barcode || '';
            // Action buttons
            const actionsCell = row.insertCell();
            const actionsGroup = document.createElement('div');
            actionsGroup.classList.add('action-buttons-group');

            const editBtn = document.createElement('button');
            editBtn.innerHTML = '<i class="fas fa-edit"></i> تعديل';
            editBtn.classList.add('btn', 'btn-secondary', 'action-button', 'edit-button');
            editBtn.addEventListener('click', () => {
                window.location.href = `product-form.html?id=${product.id}`;
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i> حذف';
            deleteBtn.classList.add('btn', 'btn-secondary', 'action-button', 'delete-button');
            deleteBtn.addEventListener('click', () => deleteProduct(product.id));

            const printBarcodeBtn = document.createElement('button');
            printBarcodeBtn.innerHTML = '<i class="fas fa-print"></i> باركود';
            printBarcodeBtn.classList.add('btn', 'btn-secondary', 'action-button', 'print-barcode-button');
            printBarcodeBtn.addEventListener('click', () => openPrintBarcodeModal(product.barcode, product.tradeName));

            actionsGroup.appendChild(editBtn);
            actionsGroup.appendChild(deleteBtn);
            actionsGroup.appendChild(printBarcodeBtn);
            actionsCell.appendChild(actionsGroup);
        });
    }

    // Delete Product
    async function deleteProduct(id) {
        if (confirm("هل أنت متأكد أنك تريد حذف هذا المنتج نهائيًا؟")) { // Replace with custom confirm later
            try {
                await deleteDoc(doc(db, 'products', id));
                showCustomAlert("تم حذف المنتج بنجاح!", 'success');
                loadProducts();
            } catch (error) {
                console.error("Error deleting product:", error);
                showCustomAlert("حدث خطأ أثناء حذف المنتج. يرجى المحاولة مرة أخرى.", 'error');
            }
        }
    }
}

// --- Product Form Page Logic (product-form.html) ---
if (window.location.pathname.includes('product-form.html')) {
    checkAuthStateAndRedirect(); // Check if user is logged in

    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (productId) {
        formPageTitle.textContent = 'تعديل المنتج';
        loadProductForEdit(productId);
    } else {
        formPageTitle.textContent = 'إضافة منتج جديد';
    }

    // Form Submission
    if (productForm) {
        productForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            formErrorMessage.textContent = '';

            const id = productIdInput.value;
            const tradeName = tradeNameInput.value.trim();
            const scientificName = scientificNameInput.value.trim();
            const concentration = concentrationInput.value.trim();
            const pharmaceuticalForm = pharmaceuticalFormInput.value.trim();
            const quantity = parseFloat(quantityInput.value);
            const purchasePrice = parseFloat(purchasePriceInput.value);
            const salePrice = parseFloat(salePriceInput.value);
            const unitType = unitTypeInput.value;
            const subUnits = parseInt(subUnitsInput.value) || 1;
            const subSubUnits = parseInt(subSubUnitsInput.value) || 1;
            const productionDate = productionDateInput.value;
            const expiryDate = expiryDateInput.value;
            const barcode = barcodeInput.value.trim();
            const supplier = supplierInput.value.trim();
            const minStock = parseFloat(minStockInput.value);

            if (!tradeName || isNaN(quantity) || isNaN(purchasePrice) || isNaN(salePrice) || isNaN(minStock)) {
                formErrorMessage.textContent = 'الاسم التجاري، الكمية، سعر الشراء، سعر البيع، وحد أدنى للمخزون هي حقول مطلوبة ويجب أن تكون أرقامًا صحيحة.';
                showCustomAlert('يرجى ملء جميع الحقول المطلوبة بشكل صحيح.', 'error');
                return;
            }
            if (subUnits < 1 || subSubUnits < 1) {
                formErrorMessage.textContent = 'يجب أن تكون الوحدات الفرعية أكبر من أو تساوي 1.';
                showCustomAlert('يجب أن تكون الوحدات الفرعية أكبر من أو تساوي 1.', 'error');
                return;
            }
            if (expiryDate && new Date(expiryDate) < new Date()) {
                formErrorMessage.textContent = 'تاريخ الانتهاء لا يمكن أن يكون في الماضي.';
                showCustomAlert('تاريخ الانتهاء لا يمكن أن يكون في الماضي.', 'error');
                return;
            }

            try {
                const productData = {
                    tradeName,
                    scientificName,
                    concentration,
                    pharmaceuticalForm,
                    quantity,
                    purchasePrice,
                    salePrice,
                    unitType,
                    subUnits,
                    subSubUnits,
                    productionDate,
                    expiryDate,
                    barcode,
                    supplier,
                    minStock,
                    lastUpdated: new Date().toISOString()
                };

                if (id) {
                    await updateDoc(doc(db, 'products', id), productData);
                    showCustomAlert("تم تحديث المنتج بنجاح!", 'success');
                } else {
                    await addDoc(collection(db, 'products'), productData);
                    showCustomAlert("تم إضافة المنتج بنجاح!", 'success');
                    productForm.reset(); // Clear form for new entry
                    generatedBarcodeSvg.innerHTML = '';
                    productIdInput.value = ''; // Ensure ID is clear for next add
                }
                // Optional: Redirect back to dashboard after successful save
                // setTimeout(() => { window.location.href = 'dashboard.html'; }, 1500);

            } catch (error) {
                console.error("Error saving product:", error);
                formErrorMessage.textContent = 'حدث خطأ أثناء حفظ المنتج: ' + error.message;
                showCustomAlert('حدث خطأ أثناء حفظ المنتج.', 'error');
            }
        });
    }

    // Load product data for editing
    async function loadProductForEdit(id) {
        try {
            const productDoc = await getDoc(doc(db, 'products', id));
            if (productDoc.exists()) {
                const product = productDoc.data();
                productIdInput.value = productDoc.id;
                tradeNameInput.value = product.tradeName || '';
                scientificNameInput.value = product.scientificName || '';
                concentrationInput.value = product.concentration || '';
                pharmaceuticalFormInput.value = product.pharmaceuticalForm || '';
                quantityInput.value = product.quantity !== undefined ? product.quantity : '';
                purchasePriceInput.value = product.purchasePrice !== undefined ? product.purchasePrice : '';
                salePriceInput.value = product.salePrice !== undefined ? product.salePrice : '';
                unitTypeInput.value = product.unitType || 'علبة';
                subUnitsInput.value = product.subUnits !== undefined ? product.subUnits : 1;
                subSubUnitsInput.value = product.subSubUnits !== undefined ? product.subSubUnits : 1;
                productionDateInput.value = product.productionDate || '';
                expiryDateInput.value = product.expiryDate || '';
                barcodeInput.value = product.barcode || '';
                supplierInput.value = product.supplier || '';
                minStockInput.value = product.minStock !== undefined ? product.minStock : 10;

                if (product.barcode) {
                    JsBarcode("#generatedBarcode", product.barcode, {
                        format: "CODE128",
                        width: 2,
                        height: 50,
                        displayValue: true
                    });
                }
            } else {
                showCustomAlert("المنتج غير موجود.", 'error');
                // Optional: Redirect to add new product if not found
                // setTimeout(() => { window.location.href = 'product-form.html'; }, 1500);
            }
        } catch (error) {
            console.error("Error loading product for edit:", error);
            showCustomAlert('حدث خطأ أثناء تحميل بيانات المنتج.', 'error');
        }
    }

    // Barcode Scan for Product Form
    if (scanBarcodeBtn) {
        scanBarcodeBtn.addEventListener('click', () => {
            scannerResults.textContent = 'جاري البحث عن باركود...';
            scannerModal.style.display = 'flex';
            initBarcodeScanner(false); // Pass false to indicate it's for form input
        });
    }

    // Barcode Generation for Product Form
    if (generateBarcodeBtn) {
        generateBarcodeBtn.addEventListener('click', () => {
            const value = barcodeInput.value.trim() || `PHARM${Date.now()}`;
            barcodeInput.value = value;
            generatedBarcodeSvg.innerHTML = '';
            JsBarcode("#generatedBarcode", value, {
                format: "CODE128",
                width: 2,
                height: 50,
                displayValue: true
            });
        });
    }
}

// --- Common Modal & Barcode Scanner Logic ---

// Close all modals (shared function)
document.querySelectorAll('.close-button').forEach(btn => {
    btn.addEventListener('click', () => {
        if (scannerModal) scannerModal.style.display = 'none';
        if (printBarcodeModal) printBarcodeModal.style.display = 'none';

        // Stop scanner if running
        if (window.Quagga && Quagga.initialized) {
            Quagga.stop();
            if (interactiveViewport) interactiveViewport.innerHTML = '';
            if (scannerResults) scannerResults.textContent = '';
        }
    });
});

// Close modal if clicked outside (shared function)
window.addEventListener('click', (event) => {
    if (scannerModal && event.target === scannerModal) {
        scannerModal.style.display = 'none';
        if (window.Quagga && Quagga.initialized) {
            Quagga.stop();
            if (interactiveViewport) interactiveViewport.innerHTML = '';
            if (scannerResults) scannerResults.textContent = '';
        }
    }
    if (printBarcodeModal && event.target === printBarcodeModal) {
        printBarcodeModal.style.display = 'none';
    }
});

// Initialize Barcode Scanner (QuaggaJS) - shared function
let isScannerInitialized = false;
function initBarcodeScanner(isSearchMode = false) {
    if (isScannerInitialized) { // Ensure only one instance is running
        Quagga.stop();
        isScannerInitialized = false;
    }

    if (!interactiveViewport) {
        console.error("Interactive viewport not found for scanner.");
        showCustomAlert('خطأ: عنصر عرض الكاميرا غير موجود.', 'error');
        return;
    }

    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: interactiveViewport,
            constraints: {
                width: 640,
                height: 480,
                facingMode: "environment" // Use rear camera
            },
        },
        decoder: {
            readers: ["ean_reader", "code_128_reader", "code_39_reader"]
        }
    }, function (err) {
        if (err) {
            console.error("Error initializing Quagga:", err);
            scannerResults.textContent = 'خطأ في تهيئة الماسح الضوئي: ' + err.message;
            showCustomAlert('خطأ في تشغيل الماسح الضوئي.', 'error');
            return;
        }
        console.log("Quagga initialization finished. Ready to start.");
        Quagga.start();
        isScannerInitialized = true;
    });

    Quagga.onDetected(function (data) {
        const code = data.codeResult.code;
        console.log("Barcode detected:", code);
        scannerResults.textContent = `تم العثور على الباركود: ${code}`;
        
        if (isSearchMode) {
            if (searchInput) {
                searchInput.value = code;
                applySearchAndFilter(); // Trigger search immediately
            }
        } else { // Form mode
            if (barcodeInput) {
                barcodeInput.value = code;
                if (generatedBarcodeSvg) { // Generate SVG for form
                    generatedBarcodeSvg.innerHTML = '';
                    JsBarcode("#generatedBarcode", code, {
                        format: "CODE128",
                        width: 2,
                        height: 50,
                        displayValue: true
                    });
                }
            }
        }
        
        if (window.Quagga) {
            Quagga.stop();
            isScannerInitialized = false;
            interactiveViewport.innerHTML = '';
        }
        if (scannerModal) scannerModal.style.display = 'none';
        showCustomAlert(`تم مسح الباركود بنجاح: ${code}`, 'success');
    });

    // Drawing debug lines (optional, but good for feedback)
    Quagga.onProcessed(function (result) {
        var drawingCtx = Quagga.canvas.ctx.overlay,
            drawingCanvas = Quagga.canvas.dom.overlay;

        if (result) {
            if (result.boxes) {
                drawingCtx.clearRect(0, 0, parseInt(drawingCanvas.width), parseInt(drawingCanvas.height));
                result.boxes.filter(function (box) {
                    return box !== result.box;
                }).forEach(function (box) {
                    Quagga.ImageDebug.drawPath(box, { x: 0, y: 1 }, drawingCtx, { color: "green", lineWidth: 2 });
                });
            }

            if (result.box) {
                Quagga.ImageDebug.drawPath(result.box, { x: 0, y: 1 }, drawingCtx, { color: "#00F", lineWidth: 2 });
            }

            if (result.codeResult && result.codeResult.code) {
                Quagga.ImageDebug.drawPath(result.line, { x: 'x', y: 'y' }, drawingCtx, { color: "red", lineWidth: 3 });
            }
        }
    });
}

// --- Print Barcode Functionality (shared function) ---
function openPrintBarcodeModal(barcodeValue, productName) {
    if (!barcodeValue) {
        showCustomAlert("لا يوجد باركود لطباعته لهذا المنتج.", 'error');
        return;
    }
    if (barcodeToPrintDiv) {
        barcodeToPrintDiv.innerHTML = `
            <p>${productName || 'منتج صيدلية'}</p>
            <svg id="printSvgBarcode"></svg>
            <p class="barcode-text">${barcodeValue}</p>
        `;
        // Ensure JsBarcode is available globally or imported
        if (window.JsBarcode) {
            JsBarcode("#printSvgBarcode", barcodeValue, {
                format: "CODE128",
                width: 2,
                height: 60,
                displayValue: true,
                fontSize: 18,
                textMargin: 0
            });
        } else {
            console.error("JsBarcode library not loaded.");
            showCustomAlert("خطأ: مكتبة الباركود غير محملة.", 'error');
            return;
        }
    }
    if (printBarcodeModal) {
        printBarcodeModal.style.display = 'flex';
    }
}

// Function to handle actual print action for a specific div
window.printDiv = function(divId) {
    var printContents = document.getElementById(divId);
    if (!printContents) {
        showCustomAlert("خطأ في الطباعة: العنصر غير موجود.", 'error');
        return;
    }
    
    // Create a new window for printing
    var printWindow = window.open('', '_blank');
    printWindow.document.write('<html><head><title>طباعة الباركود</title>');
    // Copy necessary CSS for printing
    printWindow.document.write('<link rel="stylesheet" href="style.css">');
    printWindow.document.write('</head><body>');
    printWindow.document.write('<div style="font-family: \'Cairo\', sans-serif; text-align: center;">');
    printWindow.document.write(printContents.innerHTML);
    printWindow.document.write('</div></body></html>');
    printWindow.document.close();
    printWindow.focus();

    // Give some time for content to render, then print
    printWindow.onload = function() {
        printWindow.print();
        printWindow.close();
        showCustomAlert("تم إرسال الباركود للطباعة.", 'success');
    };
    
    // After printing, ensure original modal is closed and state is clean
    if (printBarcodeModal) printBarcodeModal.style.display = 'none';
};
