// DOM 元素
const header = document.querySelector('.header');
const mobileToggle = document.querySelector('.header__mobile-toggle');
const bannerSlides = document.querySelectorAll('.banner__slide');
const bannerDots = document.querySelectorAll('.banner__dot');
const prevButton = document.querySelector('.banner__prev');
const nextButton = document.querySelector('.banner__next');

// 当前轮播索引
let currentSlideIndex = 0;

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化轮播
    showSlide(currentSlideIndex);
    
    // 初始化事件监听
    initEventListeners();
    
    // 自动轮播
    startAutoSlide();
});

// 初始化事件监听
function initEventListeners() {
    // 移动端菜单切换
    mobileToggle.addEventListener('click', toggleMobileMenu);
    
    // 轮播控制按钮事件
    prevButton.addEventListener('click', prevSlide);
    nextButton.addEventListener('click', nextSlide);
    
    // 轮播点击事件
    bannerDots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            showSlide(index);
        });
    });
    
    // 滚动事件 - 导航栏固定
    window.addEventListener('scroll', handleScroll);
}

// 移动端菜单切换
function toggleMobileMenu() {
    header.classList.toggle('mobile-menu-active');
}

// 显示特定幻灯片
function showSlide(index) {
    // 更新索引
    currentSlideIndex = index;
    
    // 如果索引超出范围，重置
    if (currentSlideIndex >= bannerSlides.length) {
        currentSlideIndex = 0;
    } else if (currentSlideIndex < 0) {
        currentSlideIndex = bannerSlides.length - 1;
    }
    
    // 隐藏所有幻灯片
    bannerSlides.forEach(slide => {
        slide.classList.remove('active');
    });
    
    // 重置所有点
    bannerDots.forEach(dot => {
        dot.classList.remove('active');
    });
    
    // 显示当前幻灯片和点
    bannerSlides[currentSlideIndex].classList.add('active');
    bannerDots[currentSlideIndex].classList.add('active');
}

// 上一张幻灯片
function prevSlide() {
    showSlide(currentSlideIndex - 1);
}

// 下一张幻灯片
function nextSlide() {
    showSlide(currentSlideIndex + 1);
}

// 自动轮播
let slideInterval;
function startAutoSlide() {
    // 每5秒切换一次
    slideInterval = setInterval(() => {
        nextSlide();
    }, 5000);
}

// 暂停自动轮播
function pauseAutoSlide() {
    clearInterval(slideInterval);
}

// 恢复自动轮播
function resumeAutoSlide() {
    pauseAutoSlide();
    startAutoSlide();
}

// 处理滚动事件
function handleScroll() {
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
} 