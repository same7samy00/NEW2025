// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, addDoc, updateDoc, deleteDoc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js";

// Your web app's Firebase configuration - REPLACE WITH YOUR ACTUAL CONFIG
const firebaseConfig = {
    apiKey: "AIzaSyC9eufzO00_JtbdVoDrw-bJfF1PY3meYoE",
    authDomain: "new2025-d2fba.firebaseapp.com",
    projectId: "new2025-d2fba",
    storageBucket: "new2025-d2fba.firebasestorage.app",
    messagingSenderId: "239931222059",
    appId: "1:239931222059:web:6275e5aa6577fb14f4e26e",
    measurementId: "G-3F4TJ0K34J"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// --- Global DOM Elements ---
// Login Page
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMessageDiv = document.getElementById('errorMessage');

// Dashboard Page
const logoutBtnTop = document.getElementById('logoutBtnTop');
const logoutBtnBottom = document.getElementById('logoutBtnBottom'); // New for bottom nav
const productsTableBody = document.getElementById('productsTableBody');
const noProductsMessage = document.getElementById('noProductsMessage');
const loadingSpinner = document.getElementById('loadingSpinner');
const addProductBtn = document.getElementById('addProductBtn');
const searchInput = document.getElementById('searchInput');
const filterCategory = document.getElementById('filterCategory');

// Product Modal elements
const productModal = document.getElementById('productModal');
const closeButtons = document.querySelectorAll('.close-button'); // For all modals
const modalTitle = document.getElementById('modalTitle');
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
const scanBarcodeBtn = document.getElementById('scanBarcodeBtn');
const generateBarcodeBtn = document.getElementById('generateBarcodeBtn');
const generatedBarcodeSvg = document.getElementById('generatedBarcode');
const supplierInput = document.getElementById('supplier');
const minStockInput = document.getElementById('minStock');
const productImageInput = document.getElementById('productImage');
const currentProductImage = document.getElementById('currentProductImage');
const formErrorMessage = document.getElementById('formErrorMessage');

// Scanner Modal elements
const scannerModal = document.getElementById('scannerModal');
const closeScannerBtn = document.getElementById('closeScanner');
const interactiveViewport = document.getElementById('interactive');
const scannerResults = document.getElementById('scannerResults');

// Print Barcode Modal elements
const printBarcodeModal = document.getElementById('printBarcodeModal');
const closePrintBarcodeBtn = document.getElementById('closePrintBarcode');
const barcodeToPrintDiv = document.getElementById('barcodeToPrint');

// --- Login Logic (for index.html) ---
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput.value;
        const password = passwordInput.value;
        errorMessageDiv.textContent = '';

        try {
            await signInWithEmailAndPassword(auth, email, password);
            window.location.href = "dashboard.html";
        } catch (error) {
            console.error("Login Error:", error);
            switch (error.code) {
                case 'auth/invalid-email':
                    errorMessageDiv.textContent = 'البريد الإلكتروني غير صالح.';
                    break;
                case 'auth/user-disabled':
                    errorMessageDiv.textContent = 'هذا الحساب معطل.';
                    break;
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                    errorMessageDiv.textContent = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
                    break;
                default:
                    errorMessageDiv.textContent = 'حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.';
            }
        }
    });
}

// --- Dashboard Logic (for dashboard.html) ---
if (window.location.pathname.includes('dashboard.html')) {
    let allProductsData = []; // Store all products for client-side search/filter

    // Check auth state on dashboard load
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("User logged in:", user.email);
            loadProducts();
        } else {
            console.log("User not logged in. Redirecting to login.");
            window.location.href = "index.html";
        }
    });

    // Logout buttons
    if (logoutBtnTop) {
        logoutBtnTop.addEventListener('click', async () => {
            try {
                await signOut(auth);
                window.location.href = "index.html";
            } catch (error) {
                console.error("Logout Error:", error);
                alert("حدث خطأ أثناء تسجيل الخروج. يرجى المحاولة مرة أخرى.");
            }
        });
    }
    if (logoutBtnBottom) { // For mobile bottom nav
        logoutBtnBottom.addEventListener('click', async () => {
            try {
                await signOut(auth);
                window.location.href = "index.html";
            } catch (error) {
                console.error("Logout Error:", error);
                alert("حدث خطأ أثناء تسجيل الخروج. يرجى المحاولة مرة أخرى.");
            }
        });
    }

    // --- Product Management Functions ---

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
        let q = query(productsRef, orderBy('lastUpdated', 'desc')); // Order by last updated

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

            // Apply current search and filter
            applySearchAndFilter();

        } catch (error) {
            console.error("Error loading products:", error);
            productsTableBody.innerHTML = `<tr><td colspan="7" class="error-message-cell">حدث خطأ أثناء تحميل المنتجات. يرجى إعادة المحاولة.</td></tr>`;
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
        productsTableBody.innerHTML = ''; // Clear existing rows
        products.forEach(product => {
            const row = productsTableBody.insertRow();
            row.dataset.id = product.id;

            // Apply styling for expiry/low stock
            const daysUntilExpiry = getDaysUntilExpiry(product.expiryDate);
            if (daysUntilExpiry !== null) {
                if (daysUntilExpiry <= 0) {
                    row.classList.add('expired-product');
                } else if (daysUntilExpiry <= 90) { // 3 months warning
                    row.classList.add('expiring-soon');
                }
            }
            if (product.quantity !== undefined && product.minStock !== undefined && product.quantity <= product.minStock) {
                row.classList.add('low-stock');
            }

            // Image thumbnail
            const imgCell = row.insertCell();
            if (product.imageUrl) {
                const img = document.createElement('img');
                img.src = product.imageUrl;
                img.alt = product.tradeName;
                img.classList.add('product-thumb');
                imgCell.appendChild(img);
            } else {
                imgCell.textContent = 'لا توجد صورة';
            }

            row.insertCell().textContent = product.tradeName || '';
            // Scientific Name is hidden on mobile by CSS
            const scientificNameCell = row.insertCell();
            scientificNameCell.textContent = product.scientificName || '';
            scientificNameCell.classList.add('hide-on-mobile'); // Add class for CSS hiding

            row.insertCell().textContent = product.quantity !== undefined ? `${product.quantity} ${product.unitType || 'علبة'}` : '';
            
            // Purchase Price is hidden on mobile by CSS
            const purchasePriceCell = row.insertCell();
            purchasePriceCell.textContent = product.purchasePrice !== undefined ? `${product.purchasePrice.toFixed(2)} EGP` : '';
            purchasePriceCell.classList.add('hide-on-mobile'); // Add class for CSS hiding

            row.insertCell().textContent = product.salePrice !== undefined ? `${product.salePrice.toFixed(2)} EGP` : '';

            // Calculate profit and hide on mobile
            const profitCell = row.insertCell();
            const profit = (product.salePrice - product.purchasePrice) * product.quantity;
            profitCell.textContent = profit !== undefined && !isNaN(profit) ? `${profit.toFixed(2)} EGP` : 'N/A';
            profitCell.classList.add('hide-on-mobile'); // Add class for CSS hiding

            row.insertCell().textContent = product.expiryDate || '';
            row.insertCell().textContent = product.barcode || '';
            
            // Supplier is hidden on mobile by CSS
            const supplierCell = row.insertCell();
            supplierCell.textContent = product.supplier || '';
            supplierCell.classList.add('hide-on-mobile'); // Add class for CSS hiding

            // Actions Cell
            const actionsCell = row.insertCell();
            const editBtn = document.createElement('button');
            editBtn.innerHTML = '<i class="fas fa-edit"></i> تعديل';
            editBtn.classList.add('action-button', 'edit-button');
            editBtn.addEventListener('click', () => openProductModalForEdit(product));

            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i> حذف';
            deleteBtn.classList.add('action-button', 'delete-button');
            deleteBtn.addEventListener('click', () => deleteProduct(product.id, product.imagePath));

            const printBarcodeBtn = document.createElement('button');
            printBarcodeBtn.innerHTML = '<i class="fas fa-print"></i> باركود';
            printBarcodeBtn.classList.add('action-button', 'print-barcode-button');
            printBarcodeBtn.addEventListener('click', () => openPrintBarcodeModal(product.barcode, product.tradeName));

            actionsCell.appendChild(editBtn);
            actionsCell.appendChild(deleteBtn);
            actionsCell.appendChild(printBarcodeBtn);
        });
    }

    // Delete Product
    async function deleteProduct(id, imagePath) {
        if (confirm("هل أنت متأكد أنك تريد حذف هذا المنتج نهائيًا؟")) {
            try {
                // Delete image from Storage if exists
                if (imagePath) {
                    const imageRef = ref(storage, imagePath);
                    await deleteObject(imageRef);
                    console.log("Image deleted successfully from Storage.");
                }
                // Delete document from Firestore
                await deleteDoc(doc(db, 'products', id));
                console.log("Product deleted successfully from Firestore.");
                loadProducts(); // Reload products
            } catch (error) {
                console.error("Error deleting product:", error);
                alert("حدث خطأ أثناء حذف المنتج. يرجى المحاولة مرة أخرى.");
            }
        }
    }

    // --- Modal Handling (Add/Edit Product) ---

    // Open Add Product Modal
    addProductBtn.addEventListener('click', () => {
        productForm.reset(); // Clear form
        productIdInput.value = ''; // Clear product ID
        modalTitle.textContent = 'إضافة منتج جديد';
        currentProductImage.style.display = 'none'; // Hide image preview for new product
        currentProductImage.src = '';
        generatedBarcodeSvg.innerHTML = ''; // Clear barcode SVG
        formErrorMessage.textContent = '';
        productModal.style.display = 'flex';
    });

    // Open Edit Product Modal
    function openProductModalForEdit(product) {
        productForm.reset(); // Clear form
        modalTitle.textContent = 'تعديل المنتج';
        productIdInput.value = product.id;
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
        
        // Show current image if available
        if (product.imageUrl) {
            currentProductImage.src = product.imageUrl;
            currentProductImage.style.display = 'block';
        } else {
            currentProductImage.style.display = 'none';
        }

        // Generate barcode SVG if barcode exists
        generatedBarcodeSvg.innerHTML = '';
        if (product.barcode) {
            JsBarcode("#generatedBarcode", product.barcode, {
                format: "CODE128",
                width: 2,
                height: 50,
                displayValue: true
            });
        }
        formErrorMessage.textContent = '';
        productModal.style.display = 'flex';
    }

    // Close all modals
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            productModal.style.display = 'none';
            scannerModal.style.display = 'none';
            printBarcodeModal.style.display = 'none';
            // Stop scanner if running
            if (window.Quagga && Quagga.initialized) { // Check if Quagga is loaded and initialized
                Quagga.stop();
                interactiveViewport.innerHTML = ''; // Clear video feed
                scannerResults.textContent = '';
            }
        });
    });

    // Close modal if clicked outside
    window.addEventListener('click', (event) => {
        if (event.target === productModal) {
            productModal.style.display = 'none';
        }
        if (event.target === scannerModal) {
            scannerModal.style.display = 'none';
            if (window.Quagga && Quagga.initialized) {
                Quagga.stop();
                interactiveViewport.innerHTML = '';
                scannerResults.textContent = '';
            }
        }
        if (event.target === printBarcodeModal) {
            printBarcodeModal.style.display = 'none';
        }
    });

    // --- Add/Edit Product Form Submission ---
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
        const subUnits = parseInt(subUnitsInput.value) || 1; // Default to 1 if not set
        const subSubUnits = parseInt(subSubUnitsInput.value) || 1; // Default to 1 if not set
        const productionDate = productionDateInput.value;
        const expiryDate = expiryDateInput.value;
        const barcode = barcodeInput.value.trim();
        const supplier = supplierInput.value.trim();
        const minStock = parseFloat(minStockInput.value);
        const productImageFile = productImageInput.files[0];

        if (!tradeName || isNaN(quantity) || isNaN(purchasePrice) || isNaN(salePrice) || isNaN(minStock)) {
            formErrorMessage.textContent = 'الاسم التجاري، الكمية، سعر الشراء، سعر البيع، وحد أدنى للمخزون هي حقول مطلوبة ويجب أن تكون أرقامًا صحيحة.';
            return;
        }
        if (subUnits < 1 || subSubUnits < 1) {
            formErrorMessage.textContent = 'يجب أن تكون الوحدات الفرعية أكبر من أو تساوي 1.';
            return;
        }
        if (expiryDate && new Date(expiryDate) < new Date()) {
            formErrorMessage.textContent = 'تاريخ الانتهاء لا يمكن أن يكون في الماضي.';
            return;
        }

        let imageUrl = currentProductImage.src === '' ? null : currentProductImage.src; // Keep existing image
        let imagePath = productIdInput.value ? (allProductsData.find(p => p.id === productIdInput.value)?.imagePath || null) : null;


        try {
            if (productImageFile) {
                // If a new image is uploaded, delete the old one if it exists
                if (imagePath) {
                    const oldImageRef = ref(storage, imagePath);
                    await deleteObject(oldImageRef).catch(e => console.warn("Could not delete old image:", e.message));
                }
                const storageRef = ref(storage, `product_images/${Date.now()}_${productImageFile.name}`);
                const snapshot = await uploadBytes(storageRef, productImageFile);
                imageUrl = await getDownloadURL(snapshot.ref);
                imagePath = snapshot.metadata.fullPath; // Store full path for deletion later
                console.log("Image uploaded:", imageUrl);
            } else if (currentProductImage.style.display === 'none' && imagePath) {
                // If image was removed (preview hidden) and there was an old image, delete it
                const oldImageRef = ref(storage, imagePath);
                await deleteObject(oldImageRef).catch(e => console.warn("Could not delete old image:", e.message));
                imageUrl = null;
                imagePath = null;
            }


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
                imageUrl,
                imagePath, // Save path for deletion
                lastUpdated: new Date().toISOString()
            };

            if (id) {
                // Update existing product
                await updateDoc(doc(db, 'products', id), productData);
                alert("تم تحديث المنتج بنجاح!");
            } else {
                // Add new product
                await addDoc(collection(db, 'products'), productData);
                alert("تم إضافة المنتج بنجاح!");
            }

            productModal.style.display = 'none';
            loadProducts(); // Reload products to update table
        } catch (error) {
            console.error("Error saving product:", error);
            formErrorMessage.textContent = 'حدث خطأ أثناء حفظ المنتج: ' + error.message;
        }
    });

    // --- Search and Filter Event Listeners ---
    searchInput.addEventListener('input', applySearchAndFilter);
    filterCategory.addEventListener('change', applySearchAndFilter);

    // --- Barcode Scanner Logic (QuaggaJS) ---
    scanBarcodeBtn.addEventListener('click', () => {
        scannerResults.textContent = 'جاري البحث عن باركود...';
        scannerModal.style.display = 'flex';
        initBarcodeScanner();
    });

    closeScannerBtn.addEventListener('click', () => {
        scannerModal.style.display = 'none';
        if (window.Quagga && Quagga.initialized) {
            Quagga.stop();
            interactiveViewport.innerHTML = ''; // Clear video feed
            scannerResults.textContent = '';
        }
    });

    function initBarcodeScanner() {
        if (window.Quagga && Quagga.initialized) {
            Quagga.stop(); // Ensure previous instance is stopped
        }

        Quagga.init({
            inputStream: {
                name: "Live",
                type: "LiveStream",
                target: interactiveViewport,
                constraints: {
                    width: 640,
                    height: 480,
                    facingMode: "environment" // Use rear camera on mobile
                },
            },
            decoder: {
                readers: ["ean_reader", "code_128_reader", "code_39_reader"] // Specify common barcode types
            }
        }, function (err) {
            if (err) {
                console.error("Error initializing Quagga:", err);
                scannerResults.textContent = 'خطأ في تهيئة الماسح الضوئي: ' + err.message;
                return;
            }
            console.log("Quagga initialization finished. Ready to start.");
            Quagga.start();
        });

        Quagga.onDetected(function (data) {
            const code = data.codeResult.code;
            console.log("Barcode detected and processed:", code);
            scannerResults.textContent = `تم العثور على الباركود: ${code}`;
            barcodeInput.value = code; // Put scanned barcode into the input field
            // Stop scanning after successful detection
            if (window.Quagga) { // Ensure Quagga is still loaded
                Quagga.stop();
                interactiveViewport.innerHTML = ''; // Clear video feed
            }
            scannerModal.style.display = 'none';
        });

        // Optional: Draw scan lines for better feedback
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

    // --- Barcode Generation (JsBarcode) ---
    generateBarcodeBtn.addEventListener('click', () => {
        const value = barcodeInput.value.trim() || `PHARM${Date.now()}`; // Default if empty
        barcodeInput.value = value; // Update input with generated value
        
        generatedBarcodeSvg.innerHTML = ''; // Clear previous SVG
        JsBarcode("#generatedBarcode", value, {
            format: "CODE128", // Or other formats like EAN13
            width: 2,
            height: 50,
            displayValue: true
        });
    });

    // --- Print Barcode Functionality ---
    function openPrintBarcodeModal(barcodeValue, productName) {
        if (!barcodeValue) {
            alert("لا يوجد باركود لطباعته لهذا المنتج.");
            return;
        }
        barcodeToPrintDiv.innerHTML = `
            <p>${productName || ''}</p>
            <svg id="printSvgBarcode"></svg>
            <p>${barcodeValue}</p>
        `;
        JsBarcode("#printSvgBarcode", barcodeValue, {
            format: "CODE128",
            width: 2,
            height: 60,
            displayValue: true,
            fontSize: 18,
            textMargin: 0
        });
        printBarcodeModal.style.display = 'flex';
    }

    // Function to handle actual print action for a specific div
    window.printDiv = function(divId) {
        var printContents = document.getElementById(divId).innerHTML;
        var originalContents = document.body.innerHTML;
        document.body.innerHTML = printContents;
        window.print();
        document.body.innerHTML = originalContents;
        // Reload page to restore event listeners and app state if needed
        window.location.reload(); 
    }

    // --- Bottom Navigation (Placeholder for now) ---
    const bottomNavItems = document.querySelectorAll('.nav-item-bottom');
    bottomNavItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            // Remove active from all
            bottomNavItems.forEach(i => i.classList.remove('active'));
            // Add active to clicked
            item.classList.add('active');

            const section = item.dataset.section;
            alert(`سيتم عرض قسم: ${section}\n(هذه الأقسام قيد التطوير)`);
            // In a real app, you would hide/show different content sections
            // For now, it's just an alert.
            // Example: if (section === 'products') { showProductsSection(); }
        });
    });

}
