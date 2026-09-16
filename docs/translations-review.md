# Interface translation review

Generated from `src/i18n/dictionaries/*.ts` by `scripts/export-translations.ts`. The Sorani and
Arabic columns are DRAFTS written during implementation and must be reviewed by a native
speaker before launch (spec section 15). `{name}` placeholders are filled in at runtime and
must be kept; plural entries list one line per form.

| Key | English | Sorani (ckb) | Arabic (ar) | Reviewed |
| --- | --- | --- | --- | --- |
| `meta.siteName` | Starlight Jewellery | Starlight Jewellery | Starlight Jewellery | ☐ |
| `meta.homeTitle` | Handmade jewellery and accessories | خشڵ و ئەکسسوارى دەستکرد | مجوهرات وإكسسوارات مصنوعة يدويًا | ☐ |
| `meta.homeDescription` | Starlight Jewellery makes handmade jewellery and accessories. Browse the catalogue with prices in Iraqi dinars, check delivery fees by city and enquire on Instagram. | ستارلایت جوێلەری خشڵ و ئەکسسواری دەستکرد دروست دەکات. کاتالۆگەکە ببینە بە نرخی دیناری عێراقی، کرێی گەیاندن بەپێی شار ببینە و لە ئینستاگرام پرسیار بکە. | ستارلايت جوليري تصنع مجوهرات وإكسسوارات يدوية. تصفّح الكتالوج بأسعار بالدينار العراقي، واطّلع على أجور التوصيل حسب المدينة، واستفسر عبر إنستغرام. | ☐ |
| `meta.productsTitle` | Products | بەرهەمەکان | المنتجات | ☐ |
| `meta.productsDescription` | Search and filter handmade necklaces, bracelets, rings, earrings and accessories with prices in Iraqi dinars. | گەڕان و فلتەرکردنی ملوانکە، بازن، ئەڵقە، گوارە و ئەکسسواری دەستکرد بە نرخی دیناری عێراقی. | ابحث وصفِّ القلائد والأساور والخواتم والأقراط والإكسسوارات اليدوية بأسعار بالدينار العراقي. | ☐ |
| `meta.aboutTitle` | About | دەربارە | من نحن | ☐ |
| `meta.contactTitle` | Contact | پەیوەندی | اتصل بنا | ☐ |
| `meta.notFoundTitle` | Page not found | لاپەڕەکە نەدۆزرایەوە | الصفحة غير موجودة | ☐ |
| `meta.productDescriptionFallback` | {name} — handmade by Starlight Jewellery. Enquire on Instagram. | {name} — دەستکردی ستارلایت جوێلەری. لە ئینستاگرام پرسیار بکە. | {name} — صناعة يدوية من ستارلايت جوليري. استفسر عبر إنستغرام. | ☐ |
| `nav.home` | Home | سەرەکی | الرئيسية | ☐ |
| `nav.products` | Products | بەرهەمەکان | المنتجات | ☐ |
| `nav.delivery` | Delivery fees | کرێی گەیاندن | أجور التوصيل | ☐ |
| `nav.about` | About | دەربارە | من نحن | ☐ |
| `nav.contact` | Contact | پەیوەندی | اتصل بنا | ☐ |
| `nav.search` | Search | گەڕان | بحث | ☐ |
| `nav.language` | Language | زمان | اللغة | ☐ |
| `nav.openMenu` | Open menu | کردنەوەی مێنیو | فتح القائمة | ☐ |
| `nav.closeMenu` | Close menu | داخستنی مێنیو | إغلاق القائمة | ☐ |
| `nav.skipToContent` | Skip to content | بازدان بۆ ناوەڕۆک | الانتقال إلى المحتوى | ☐ |
| `nav.mainNavigation` | Main navigation | ڕێنیشاندەری سەرەکی | التنقل الرئيسي | ☐ |
| `nav.logoLinkLabel` | Starlight Jewellery home | لاپەڕەی سەرەکی ستارلایت جوێلەری | الصفحة الرئيسية لستارلايت جوليري | ☐ |
| `nav.switchToDark` | Switch to dark mode | گۆڕین بۆ دۆخی تاریک | التبديل إلى الوضع الداكن | ☐ |
| `nav.switchToLight` | Switch to light mode | گۆڕین بۆ دۆخی ڕووناک | التبديل إلى الوضع الفاتح | ☐ |
| `common.available` | Available | بەردەستە | متوفر | ☐ |
| `common.unavailable` | Unavailable | بەردەست نییە | غير متوفر | ☐ |
| `common.price` | Price | نرخ | السعر | ☐ |
| `common.category` | Category | پۆل | الفئة | ☐ |
| `common.currencyFormat` | IQD {amount} | {amount} دینار | {amount} د.ع | ☐ |
| `common.currencyNote` | Prices are in Iraqi dinars. Delivery fees are listed separately and are not included. | نرخەکان بە دیناری عێراقین. کرێی گەیاندن جیا نووسراوە و لەسەر نرخ زیاد ناکرێت. | الأسعار بالدينار العراقي. أجور التوصيل مذكورة بشكل منفصل ولا تُضاف إلى الأسعار. | ☐ |
| `common.inquiryNote` | Message us on Instagram for details, availability and delivery. | بۆ وردەکاری، بەردەستبوون و گەیاندن لە ئینستاگرام نامەمان بۆ بنێرە. | راسلنا عبر إنستغرام للاستفسار عن التفاصيل والتوفر والتوصيل. | ☐ |
| `common.loading` | Loading… | بارکردن… | جارٍ التحميل… | ☐ |
| `common.updating` | Updating results… | ئەنجامەکان نوێ دەکرێنەوە… | جارٍ تحديث النتائج… | ☐ |
| `common.viewAll` | View all products | هەموو بەرهەمەکان ببینە | عرض كل المنتجات | ☐ |
| `common.back` | Back | گەڕانەوە | رجوع | ☐ |
| `common.opensInNewTab` | Opens Instagram in a new tab | ئینستاگرام لە تابێکی نوێ دەکاتەوە | يفتح إنستغرام في تبويب جديد | ☐ |
| `home.heroTitle` | Handmade jewellery with a little starlight | خشڵی دەستکرد بە تیشکێک لە ئەستێرە | مجوهرات يدوية بلمسة من ضوء النجوم | ☐ |
| `home.heroLead` | Necklaces, bracelets, rings, earrings and accessories made by hand. Browse the catalogue and message us on Instagram to order. | ملوانکە، بازن، ئەڵقە، گوارە و ئەکسسوار کە بە دەست دروست کراون. کاتالۆگەکە ببینە و بۆ داواکردن لە ئینستاگرام نامەمان بۆ بنێرە. | قلائد وأساور وخواتم وأقراط وإكسسوارات مصنوعة يدويًا. تصفّح الكتالوج وراسلنا عبر إنستغرام للطلب. | ☐ |
| `home.browseProducts` | Browse products | بەرهەمەکان ببینە | تصفّح المنتجات | ☐ |
| `home.instagramAction` | Message us on Instagram | لە ئینستاگرام نامەمان بۆ بنێرە | راسلنا عبر إنستغرام | ☐ |
| `home.categoriesHeading` | Categories | پۆلەکان | الفئات | ☐ |
| `home.featuredHeading` | Featured pieces | پارچە دیارەکان | قطع مميزة | ☐ |
| `home.aboutHeading` | About Starlight Jewellery | دەربارەی ستارلایت جوێلەری | عن ستارلايت جوليري | ☐ |
| `home.contactHeading` | Enquire on Instagram | لە ئینستاگرام پرسیار بکە | استفسر عبر إنستغرام | ☐ |
| `delivery.heading` | Delivery fees | کرێی گەیاندن | أجور التوصيل | ☐ |
| `delivery.intro` | Choose your city to see the current delivery fee. Fees are information only and are never added to product prices. | شارەکەت هەڵبژێرە بۆ بینینی کرێی گەیاندنی ئێستا. کرێیەکان تەنها بۆ زانیارین و هەرگیز لەسەر نرخی بەرهەمەکان زیاد ناکرێن. | اختر مدينتك لمعرفة أجرة التوصيل الحالية. الأجور للعلم فقط ولا تُضاف أبدًا إلى أسعار المنتجات. | ☐ |
| `delivery.cityLabel` | Your city | شارەکەت | مدينتك | ☐ |
| `delivery.selectPrompt` | Select your city | شارەکەت هەڵبژێرە | اختر مدينتك | ☐ |
| `delivery.selectHint` | Select a city to see the delivery fee. | شارێک هەڵبژێرە بۆ بینینی کرێی گەیاندن. | اختر مدينة لعرض أجرة التوصيل. | ☐ |
| `delivery.showFee` | Show fee | کرێ پیشان بدە | عرض الأجرة | ☐ |
| `delivery.feeFor` | Delivery to {city}: {fee} | گەیاندن بۆ {city}: {fee} | التوصيل إلى {city}: {fee} | ☐ |
| `delivery.free` | Free delivery | گەیاندنی بەخۆڕایی | توصيل مجاني | ☐ |
| `delivery.notListed` | The city you selected is no longer listed. Please choose another city or ask us on Instagram. | ئەو شارەی هەڵتبژاردووە چیتر لە لیستەکەدا نییە. تکایە شارێکی تر هەڵبژێرە یان لە ئینستاگرام لێمان بپرسە. | المدينة التي اخترتها لم تعد مدرجة. يرجى اختيار مدينة أخرى أو سؤالنا عبر إنستغرام. | ☐ |
| `delivery.none` | Delivery fees are not listed yet. Please enquire on Instagram. | کرێی گەیاندن هێشتا نەنووسراوە. تکایە لە ئینستاگرام پرسیار بکە. | أجور التوصيل غير مدرجة بعد. يرجى الاستفسار عبر إنستغرام. | ☐ |
| `delivery.loadFailed` | We could not load the delivery fees right now. | ئێستا نەمانتوانی کرێی گەیاندن بار بکەین. | تعذّر تحميل أجور التوصيل الآن. | ☐ |
| `delivery.retry` | Try again | دووبارە هەوڵ بدەرەوە | إعادة المحاولة | ☐ |
| `delivery.unlisted` | City not listed? Ask us on Instagram to confirm delivery to your area. | شارەکەت لە لیستەکەدا نییە؟ لە ئینستاگرام لێمان بپرسە بۆ دڵنیابوون لە گەیاندن بۆ ناوچەکەت. | مدينتك غير مدرجة؟ اسألنا عبر إنستغرام للتأكد من التوصيل إلى منطقتك. | ☐ |
| `catalog.heading` | Products | بەرهەمەکان | المنتجات | ☐ |
| `catalog.searchLabel` | Search products | گەڕان لە بەرهەمەکان | البحث في المنتجات | ☐ |
| `catalog.searchPlaceholder` | Search by name or description | گەڕان بە ناو یان وەسف | ابحث بالاسم أو الوصف | ☐ |
| `catalog.searchButton` | Search | گەڕان | بحث | ☐ |
| `catalog.filtersHeading` | Filters | فلتەرەکان | التصفية | ☐ |
| `catalog.openFilters` | Filters | فلتەرەکان | التصفية | ☐ |
| `catalog.closeFilters` | Close filters | داخستنی فلتەرەکان | إغلاق التصفية | ☐ |
| `catalog.applyFilters` | Apply | جێبەجێکردن | تطبيق | ☐ |
| `catalog.clearFilters` | Clear filters | سڕینەوەی فلتەرەکان | مسح التصفية | ☐ |
| `catalog.clearAll` | Clear all | سڕینەوەی هەموو | مسح الكل | ☐ |
| `catalog.categoryLabel` | Category | پۆل | الفئة | ☐ |
| `catalog.allCategories` | All categories | هەموو پۆلەکان | كل الفئات | ☐ |
| `catalog.priceLabel` | Price (IQD) | نرخ (دینار) | السعر (د.ع) | ☐ |
| `catalog.minPrice` | Minimum price | کەمترین نرخ | أقل سعر | ☐ |
| `catalog.maxPrice` | Maximum price | زۆرترین نرخ | أعلى سعر | ☐ |
| `catalog.availabilityLabel` | Availability | بەردەستبوون | التوفر | ☐ |
| `catalog.availabilityAll` | All | هەموو | الكل | ☐ |
| `catalog.availabilityAvailable` | Available | بەردەستە | متوفر | ☐ |
| `catalog.availabilityUnavailable` | Unavailable | بەردەست نییە | غير متوفر | ☐ |
| `catalog.sortLabel` | Sort by | ڕیزکردن بەپێی | ترتيب حسب | ☐ |
| `catalog.sortRelevance` | Relevance | پەیوەندیدارترین | الأكثر صلة | ☐ |
| `catalog.sortNewest` | Newest | نوێترین | الأحدث | ☐ |
| `catalog.sortPriceAsc` | Price: low to high | نرخ: لە کەم بۆ زۆر | السعر: من الأقل إلى الأعلى | ☐ |
| `catalog.sortPriceDesc` | Price: high to low | نرخ: لە زۆر بۆ کەم | السعر: من الأعلى إلى الأقل | ☐ |
| `catalog.activeFilters` | Active filters | فلتەرە چالاکەکان | التصفية المفعّلة | ☐ |
| `catalog.removeFilter` | Remove filter: {filter} | لابردنی فلتەر: {filter} | إزالة التصفية: {filter} | ☐ |
| `catalog.resultsCount.zero` | No products | هیچ بەرهەمێک نییە | لا توجد منتجات | ☐ |
| `catalog.resultsCount.one` | {count} product | {count} بەرهەم | منتج واحد | ☐ |
| `catalog.resultsCount.other` | {count} products | {count} بەرهەم | {count} منتج | ☐ |
| `catalog.resultsCountFor.zero` | No products for “{query}” | هیچ بەرهەمێک بۆ «{query}» نییە | لا توجد منتجات لـ «{query}» | ☐ |
| `catalog.resultsCountFor.one` | {count} product for “{query}” | {count} بەرهەم بۆ «{query}» | منتج واحد لـ «{query}» | ☐ |
| `catalog.resultsCountFor.other` | {count} products for “{query}” | {count} بەرهەم بۆ «{query}» | {count} منتج لـ «{query}» | ☐ |
| `catalog.noResults` | No products match your search. | هیچ بەرهەمێک لەگەڵ گەڕانەکەت ناگونجێت. | لا توجد منتجات مطابقة لبحثك. | ☐ |
| `catalog.noResultsHint` | Try a different spelling or fewer words, or clear the filters. | ڕێنووسێکی تر یان وشەی کەمتر تاقی بکەرەوە، یان فلتەرەکان بسڕەوە. | جرّب كتابة مختلفة أو كلمات أقل، أو امسح التصفية. | ☐ |
| `catalog.pageOf` | Page {page} of {total} | لاپەڕە {page} لە {total} | الصفحة {page} من {total} | ☐ |
| `catalog.previousPage` | Previous page | لاپەڕەی پێشوو | الصفحة السابقة | ☐ |
| `catalog.nextPage` | Next page | لاپەڕەی داهاتوو | الصفحة التالية | ☐ |
| `catalog.pagination` | Pagination | لاپەڕەبەندی | ترقيم الصفحات | ☐ |
| `catalog.outOfRange` | This page does not exist. | ئەم لاپەڕەیە بوونی نییە. | هذه الصفحة غير موجودة. | ☐ |
| `catalog.goToFirstPage` | Go to the first page | بڕۆ بۆ لاپەڕەی یەکەم | الانتقال إلى الصفحة الأولى | ☐ |
| `catalog.searchQueryLabel` | Search: {query} | گەڕان: {query} | البحث: {query} | ☐ |
| `catalog.categoryChip` | Category: {name} | پۆل: {name} | الفئة: {name} | ☐ |
| `catalog.minChip` | Min IQD {value} | کەمترین {value} دینار | الأدنى {value} د.ع | ☐ |
| `catalog.maxChip` | Max IQD {value} | زۆرترین {value} دینار | الأعلى {value} د.ع | ☐ |
| `catalog.availabilityChip` | Availability: {value} | بەردەستبوون: {value} | التوفر: {value} | ☐ |
| `catalog.resultsRegion` | Search results | ئەنجامەکانی گەڕان | نتائج البحث | ☐ |
| `catalog.categoryUnavailable` | This category is no longer available. | ئەم پۆلە چیتر بەردەست نییە. | هذه الفئة لم تعد متاحة. | ☐ |
| `catalog.categoryUnavailableHint` | It may have been renamed or removed. Clear the category to see all products. | لەوانەیە ناوی گۆڕابێت یان لابرابێت. پۆلەکە بسڕەوە بۆ بینینی هەموو بەرهەمەکان. | ربما تغيّر اسمها أو أُزيلت. امسح الفئة لعرض كل المنتجات. | ☐ |
| `catalog.clearCategory` | Clear category | سڕینەوەی پۆل | مسح الفئة | ☐ |
| `errors.INVALID_PRICE_MIN` | Enter a valid minimum price in whole dinars, e.g. 10000. | کەمترین نرخێکی دروست بە دیناری تەواو بنووسە، بۆ نموونە 10000. | أدخل حدًا أدنى صحيحًا للسعر بالدينار الكامل، مثل 10000. | ☐ |
| `errors.INVALID_PRICE_MAX` | Enter a valid maximum price in whole dinars, e.g. 50000. | زۆرترین نرخێکی دروست بە دیناری تەواو بنووسە، بۆ نموونە 50000. | أدخل حدًا أعلى صحيحًا للسعر بالدينار الكامل، مثل 50000. | ☐ |
| `errors.INVALID_PRICE_RANGE` | The minimum price must not be greater than the maximum price. | کەمترین نرخ نابێت لە زۆرترین نرخ زیاتر بێت. | يجب ألا يكون الحد الأدنى للسعر أكبر من الحد الأعلى. | ☐ |
| `errors.QUERY_TOO_LONG` | Search text is limited to 120 characters. | دەقی گەڕان سنووردارە بۆ ١٢٠ پیت. | نص البحث محدود بـ ١٢٠ حرفًا. | ☐ |
| `errors.INVALID_AVAILABILITY` | Choose a valid availability option. | هەڵبژاردەیەکی دروستی بەردەستبوون هەڵبژێرە. | اختر خيار توفر صالحًا. | ☐ |
| `errors.INVALID_SORT` | Choose a valid sort order. | ڕیزکردنێکی دروست هەڵبژێرە. | اختر ترتيبًا صالحًا. | ☐ |
| `errors.INVALID_PAGE` | Choose a valid page number. | ژمارەی لاپەڕەیەکی دروست هەڵبژێرە. | اختر رقم صفحة صالحًا. | ☐ |
| `errors.INVALID_LIMIT` | Choose a valid page size. | قەبارەی لاپەڕەیەکی دروست هەڵبژێرە. | اختر حجم صفحة صالحًا. | ☐ |
| `errors.INVALID_CATEGORY` | Choose a valid category. | پۆلێکی دروست هەڵبژێرە. | اختر فئة صالحة. | ☐ |
| `errors.INVALID_LOCALE` | Unsupported language. | ئەم زمانە پشتگیری ناکرێت. | اللغة غير مدعومة. | ☐ |
| `errors.CATEGORY_UNAVAILABLE` | This category is no longer available. | ئەم پۆلە چیتر بەردەست نییە. | هذه الفئة لم تعد متاحة. | ☐ |
| `errors.CATALOG_UNAVAILABLE` | The catalogue is temporarily unavailable. Please try again in a few minutes or message us on Instagram. | کاتالۆگەکە بۆ ماوەیەک بەردەست نییە. تکایە دوای چەند خولەکێک دووبارە هەوڵ بدەرەوە یان لە ئینستاگرام نامەمان بۆ بنێرە. | الكتالوج غير متاح مؤقتًا. يرجى المحاولة بعد بضع دقائق أو مراسلتنا عبر إنستغرام. | ☐ |
| `errors.RATE_LIMITED` | Too many requests. Please wait a moment and try again. | داواکاری زۆر زۆرە. تکایە کەمێک چاوەڕێ بکە و دووبارە هەوڵ بدەرەوە. | طلبات كثيرة جدًا. يرجى الانتظار قليلًا ثم المحاولة مجددًا. | ☐ |
| `errors.unexpected` | Something went wrong. Please refresh the page or message us on Instagram. | هەڵەیەک ڕوویدا. تکایە لاپەڕەکە نوێ بکەرەوە یان لە ئینستاگرام نامەمان بۆ بنێرە. | حدث خطأ ما. يرجى تحديث الصفحة أو مراسلتنا عبر إنستغرام. | ☐ |
| `errors.formHasErrors` | Please correct the highlighted fields. | تکایە خانە دیاریکراوەکان ڕاست بکەرەوە. | يرجى تصحيح الحقول المحددة. | ☐ |
| `product.galleryLabel` | Product photos | وێنەکانی بەرهەم | صور المنتج | ☐ |
| `product.thumbnailLabel` | Show photo {index} of {total} | وێنەی {index} لە {total} پیشان بدە | عرض الصورة {index} من {total} | ☐ |
| `product.enlarge` | Enlarge photo | گەورەکردنی وێنە | تكبير الصورة | ☐ |
| `product.enlargedView` | Enlarged photo | وێنەی گەورەکراو | صورة مكبّرة | ☐ |
| `product.closeEnlarged` | Close enlarged photo | داخستنی وێنەی گەورەکراو | إغلاق الصورة المكبّرة | ☐ |
| `product.previousPhoto` | Previous photo | وێنەی پێشوو | الصورة السابقة | ☐ |
| `product.nextPhoto` | Next photo | وێنەی داهاتوو | الصورة التالية | ☐ |
| `product.photoCounter` | Photo {index} of {total} | وێنەی {index} لە {total} | الصورة {index} من {total} | ☐ |
| `product.description` | Description | وەسف | الوصف | ☐ |
| `product.enquire` | Enquire on Instagram | لە ئینستاگرام پرسیار بکە | استفسر عبر إنستغرام | ☐ |
| `product.copyLink` | Copy product link | لینکی بەرهەم کۆپی بکە | نسخ رابط المنتج | ☐ |
| `product.linkCopied` | Link copied | لینک کۆپی کرا | تم نسخ الرابط | ☐ |
| `product.copyFailed` | Copying is not available here. Select and copy the link below: | کۆپیکردن لێرە بەردەست نییە. لینکی خوارەوە دیاری بکە و کۆپی بکە: | النسخ غير متاح هنا. حدّد الرابط أدناه وانسخه: | ☐ |
| `product.enquiryHint` | Send us this product link in an Instagram message so we know which piece you mean. We reply from the shop account. | ئەم لینکی بەرهەمە لە نامەی ئینستاگرامدا بۆمان بنێرە تا بزانین مەبەستت کام پارچەیە. لە هەژماری دوکانەکەوە وەڵامت دەدەینەوە. | أرسل لنا رابط هذا المنتج في رسالة عبر إنستغرام لنعرف القطعة التي تقصدها. نرد من حساب المتجر. | ☐ |
| `product.related` | More from this category | زیاتر لەم پۆلە | المزيد من هذه الفئة | ☐ |
| `product.noPhoto` | No photo available | وێنە بەردەست نییە | لا توجد صورة | ☐ |
| `product.breadcrumb` | Breadcrumb | ڕێڕەو | مسار التنقل | ☐ |
| `contact.heading` | Contact Starlight Jewellery | پەیوەندی بە ستارلایت جوێلەری | التواصل مع ستارلايت جوليري | ☐ |
| `contact.lead` | We take enquiries and orders through Instagram messages. | پرسیار و داواکارییەکان لە ڕێگەی نامەی ئینستاگرامەوە وەردەگرین. | نستقبل الاستفسارات والطلبات عبر رسائل إنستغرام. | ☐ |
| `contact.instagram` | Instagram | ئینستاگرام | إنستغرام | ☐ |
| `contact.handleLabel` | Our handle | ناوی هەژمارەکەمان | اسم حسابنا | ☐ |
| `contact.openProfile` | Open our Instagram profile | پرۆفایلی ئینستاگرامەکەمان بکەرەوە | فتح صفحتنا على إنستغرام | ☐ |
| `contact.copyHandle` | Copy handle | ناوی هەژمار کۆپی بکە | نسخ اسم الحساب | ☐ |
| `contact.copied` | Copied | کۆپی کرا | تم النسخ | ☐ |
| `contact.howToHeading` | How to enquire | چۆن پرسیار بکەیت | كيف تستفسر | ☐ |
| `contact.step1` | Open our Instagram profile and use Message. | پرۆفایلی ئینستاگرامەکەمان بکەرەوە و «نامە» (Message) بەکاربهێنە. | افتح صفحتنا على إنستغرام واستخدم زر «رسالة» (Message). | ☐ |
| `contact.step2` | Copy the product link from the product page and paste it into your message. | لینکی بەرهەمەکە لە لاپەڕەی بەرهەم کۆپی بکە و لە نامەکەتدا دایبنێ. | انسخ رابط المنتج من صفحة المنتج وألصقه في رسالتك. | ☐ |
| `contact.step3` | Tell us your city. Delivery fees by city are listed on the home page. | شارەکەت پێمان بڵێ. کرێی گەیاندن بەپێی شار لە لاپەڕەی سەرەکی نووسراوە. | أخبرنا بمدينتك. أجور التوصيل حسب المدينة مذكورة في الصفحة الرئيسية. | ☐ |
| `contact.deliveryLink` | See delivery fees | کرێی گەیاندن ببینە | عرض أجور التوصيل | ☐ |
| `contact.note` | Instagram is a separate service: you decide whether to sign in and send a message. This website does not send messages, take orders or store your details. | ئینستاگرام خزمەتگوزارییەکی جیایە: خۆت بڕیار دەدەیت بچیتە ژوورەوە و نامە بنێریت. ئەم ماڵپەڕە نامە نانێرێت، داواکاری وەرناگرێت و زانیارییەکانت هەڵناگرێت. | إنستغرام خدمة مستقلة: أنت تقرر تسجيل الدخول وإرسال رسالة. هذا الموقع لا يرسل رسائل ولا يستقبل طلبات ولا يحفظ بياناتك. | ☐ |
| `about.heading` | About Starlight Jewellery | دەربارەی ستارلایت جوێلەری | عن ستارلايت جوليري | ☐ |
| `about.fallback` | Starlight Jewellery makes handmade jewellery and accessories. Every piece in the catalogue is made by hand; prices are in Iraqi dinars and orders are arranged through Instagram messages. | ستارلایت جوێلەری خشڵ و ئەکسسواری دەستکرد دروست دەکات. هەموو پارچەیەکی کاتالۆگەکە بە دەست دروست کراوە؛ نرخەکان بە دیناری عێراقین و داواکارییەکان لە ڕێگەی نامەی ئینستاگرامەوە ڕێک دەخرێن. | ستارلايت جوليري تصنع مجوهرات وإكسسوارات يدوية. كل قطعة في الكتالوج مصنوعة يدويًا؛ الأسعار بالدينار العراقي وتُرتَّب الطلبات عبر رسائل إنستغرام. | ☐ |
| `notFound.heading` | Page not found | لاپەڕەکە نەدۆزرایەوە | الصفحة غير موجودة | ☐ |
| `notFound.body` | The page you are looking for does not exist or is no longer available. | ئەو لاپەڕەیەی بەدوایدا دەگەڕێیت بوونی نییە یان چیتر بەردەست نییە. | الصفحة التي تبحث عنها غير موجودة أو لم تعد متاحة. | ☐ |
| `notFound.goToCatalog` | Go to the products | بڕۆ بۆ بەرهەمەکان | الانتقال إلى المنتجات | ☐ |
| `notFound.goHome` | Go to the home page | بڕۆ بۆ لاپەڕەی سەرەکی | الانتقال إلى الصفحة الرئيسية | ☐ |
| `unavailable.heading` | Catalogue temporarily unavailable | کاتالۆگەکە بۆ ماوەیەک بەردەست نییە | الكتالوج غير متاح مؤقتًا | ☐ |
| `unavailable.body` | We could not load the catalogue right now. Please try again in a few minutes, or message us on Instagram. | ئێستا نەمانتوانی کاتالۆگەکە بار بکەین. تکایە دوای چەند خولەکێک دووبارە هەوڵ بدەرەوە، یان لە ئینستاگرام نامەمان بۆ بنێرە. | تعذّر تحميل الكتالوج الآن. يرجى المحاولة بعد بضع دقائق أو مراسلتنا عبر إنستغرام. | ☐ |
| `unavailable.retry` | Try again | دووبارە هەوڵ بدەرەوە | إعادة المحاولة | ☐ |
| `footer.tagline` | Handmade jewellery and accessories. | خشڵ و ئەکسسواری دەستکرد. | مجوهرات وإكسسوارات مصنوعة يدويًا. | ☐ |
| `footer.rights` | © {year} Starlight Jewellery. All rights reserved. | © {year} ستارلایت جوێلەری. هەموو مافەکان پارێزراون. | © {year} ستارلايت جوليري. جميع الحقوق محفوظة. | ☐ |

161 strings.
