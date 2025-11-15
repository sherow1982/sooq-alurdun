// ═══════════════════════════════════════════════════════
// 📦 نظام كتالوج المنتجات - سوق الأردن
// ═══════════════════════════════════════════════════════

let allProducts = [];
let filteredProducts = [];
let currentPage = 1;
const productsPerPage = 24;
let currentCategory = "all";
let currentSort = "default";
let searchTimeout;

document.addEventListener("DOMContentLoaded", async function() {
    console.log("🚀 بدء تحميل المنتجات...");
    await loadProducts();
    renderCategories();
    setupEventListeners();
    setupBackToTop();
});

async function loadProducts() {
    try {
        console.log("📡 جاري تحميل products.json...");
        const response = await fetch("products.json");

        if (!response.ok) {
            throw new Error("فشل تحميل الملف: " + response.status);
        }

        allProducts = await response.json();
        filteredProducts = [...allProducts];

        console.log("✅ تم تحميل " + allProducts.length + " منتج");

        updateCounts();
        renderProducts();

    } catch (error) {
        console.error("❌ خطأ:", error);
        showError();
    }
}

function renderCategories() {
    const container = document.getElementById("categories");
    if (!container) return;

    const categories = ["all", ...new Set(allProducts.map(p => p.category))];

    container.innerHTML = categories.map(cat => {
        const count = cat === "all" ? allProducts.length : allProducts.filter(p => p.category === cat).length;
        const name = cat === "all" ? "جميع المنتجات" : cat;
        const active = cat === currentCategory ? "active" : "";

        return `<button class="category-btn ${active}" onclick="filterByCategory('${cat}')" data-category="${cat}">${name} (${count})</button>`;
    }).join("");
}

function filterByCategory(category) {
    currentCategory = category;
    currentPage = 1;

    document.querySelectorAll(".category-btn").forEach(btn => {
        btn.classList.remove("active");
        if (btn.dataset.category === category) {
            btn.classList.add("active");
        }
    });

    applyFilters();
}

function setupEventListeners() {
    const searchInput = document.getElementById("global-search-input");
    if (searchInput) {
        searchInput.addEventListener("input", function(e) {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                searchProducts(e.target.value);
            }, 300);
        });
    }

    const sortSelect = document.getElementById("sort-select");
    if (sortSelect) {
        sortSelect.addEventListener("change", sortProducts);
    }
}

function searchProducts(query) {
    currentPage = 1;
    applyFilters(query);
}

function applyFilters(searchQuery) {
    const query = searchQuery || document.getElementById("global-search-input")?.value || "";

    let results = currentCategory === "all" 
        ? [...allProducts] 
        : allProducts.filter(p => p.category === currentCategory);

    if (query.trim()) {
        results = results.filter(p => 
            p.title.toLowerCase().includes(query.toLowerCase()) ||
            (p.description && p.description.toLowerCase().includes(query.toLowerCase())) ||
            p.category.toLowerCase().includes(query.toLowerCase())
        );
    }

    filteredProducts = results;
    updateCounts();
    sortProducts();
}

function sortProducts() {
    const sortValue = document.getElementById("sort-select")?.value || currentSort;
    currentSort = sortValue;

    switch(sortValue) {
        case "price-low":
            filteredProducts.sort((a, b) => a.sale_price - b.sale_price);
            break;
        case "price-high":
            filteredProducts.sort((a, b) => b.sale_price - a.sale_price);
            break;
        case "name-asc":
            filteredProducts.sort((a, b) => a.title.localeCompare(b.title, "ar"));
            break;
        case "name-desc":
            filteredProducts.sort((a, b) => b.title.localeCompare(a.title, "ar"));
            break;
    }

    renderProducts();
}

function renderProducts() {
    const container = document.getElementById("products-container");
    if (!container) return;

    const loading = document.getElementById("loading");
    if (loading) loading.remove();

    if (filteredProducts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔍</div>
                <h3>لم يتم العثور على منتجات</h3>
                <p>جرب البحث بكلمات مختلفة</p>
            </div>
        `;
        return;
    }

    const startIndex = (currentPage - 1) * productsPerPage;
    const endIndex = startIndex + productsPerPage;
    const pageProducts = filteredProducts.slice(startIndex, endIndex);

    container.innerHTML = pageProducts.map(product => createProductCard(product)).join("");

    renderPagination();
    document.getElementById("showing-count").textContent = pageProducts.length;
    lazyLoadImages();
}

function createProductCard(product) {
    const discountPercent = Math.round(((product.price - product.sale_price) / product.price) * 100);
    const hasDiscount = product.price !== product.sale_price;
    const productUrl = "products-pages/" + product.filename;

    return `
        <article class="product-card" onclick="window.open('${productUrl}', '_blank')" style="cursor:pointer">
            ${hasDiscount ? `<div class="product-badge">وفّر ${discountPercent}%</div>` : ""}
            <div class="product-image-wrapper">
                <img class="product-image lazy" data-src="${product.image_link}" alt="${product.title}" loading="lazy">
            </div>
            <div class="product-info">
                <div class="product-category">${product.category}</div>
                <h3 class="product-title">${product.title}</h3>
                <div class="product-rating">
                    <div class="stars">★★★★½</div>
                    <span style="font-size:.8rem;color:#6b7280">(4.9)</span>
                </div>
                <div class="product-price">
                    <span class="current-price">${product.sale_price.toFixed(2)} د.أ</span>
                    ${hasDiscount ? `<span class="old-price">${product.price.toFixed(2)} د.أ</span>` : ""}
                </div>
            </div>
            <div class="product-footer">
                <div class="add-to-cart-btn">
                    🛒 اطلب عبر واتساب
                </div>
            </div>
        </article>
    `;
}

function renderPagination() {
    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
    const container = document.getElementById("pagination");

    if (totalPages <= 1) {
        container.style.display = "none";
        return;
    }

    container.style.display = "flex";

    let html = `<button class="page-btn" onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? "disabled" : ""}>‹</button>`;

    for (let i = 1; i <= Math.min(totalPages, 5); i++) {
        html += `<button class="page-btn ${i === currentPage ? "active" : ""}" onclick="changePage(${i})">${i}</button>`;
    }

    html += `<button class="page-btn" onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? "disabled" : ""}>›</button>`;

    container.innerHTML = html;
}

function changePage(page) {
    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
    if (page < 1 || page > totalPages) return;

    currentPage = page;
    renderProducts();
    scrollToTop();
}

function lazyLoadImages() {
    const images = document.querySelectorAll("img.lazy");

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove("lazy");
                observer.unobserve(img);
            }
        });
    });

    images.forEach(img => observer.observe(img));
}

function updateCounts() {
    document.getElementById("total-count").textContent = filteredProducts.length;
    document.getElementById("total-products").textContent = allProducts.length;
}

function setupBackToTop() {
    const btn = document.getElementById("back-to-top");
    if (!btn) return;

    window.addEventListener("scroll", () => {
        btn.classList.toggle("show", window.pageYOffset > 300);
    });

    btn.addEventListener("click", scrollToTop);
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function showError() {
    const container = document.getElementById("products-container");
    if (!container) return;

    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">⚠️</div>
            <h3 style="color:#ef4444">حدث خطأ في تحميل المنتجات</h3>
            <p>تأكد من وجود ملف products.json في المجلد الرئيسي</p>
            <button onclick="location.reload()" style="margin-top:1rem;padding:0.75rem 2rem;background:var(--primary);color:#fff;border:0;border-radius:0.5rem;cursor:pointer;font-family:Tajawal">
                إعادة المحاولة
            </button>
        </div>
    `;
}