<template>
  <div class="acct-root">
    <div v-if="visible" class="modal-overlay" @click.self="close">
      <div class="admin-panel">

        <!-- Шапка -->
        <header class="admin-header">
          <div class="header-left">
            <h2>Книга учета</h2>
            <span v-if="authenticated" class="status-badge">Онлайн</span>
          </div>
          <div class="header-right">
            <button v-if="authenticated" class="btn-refresh" @click="refreshData" :disabled="isLoading">
              <svg class="icon" :class="{ spin: isLoading }" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
                <path d="M16 21h5v-5"/>
              </svg>
              <span>Обновить</span>
            </button>
            <button class="btn-close" @click="close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </header>

        <!-- Экран авторизации -->
        <div v-if="!authenticated" class="auth-screen">
          <div class="auth-card">
            <h3>Вход в систему</h3>
            <p>Введите данные для доступа к гильдии</p>
            <input type="text" v-model="login" placeholder="Логин" @keyup.enter="checkAuth" autofocus />
            <input type="password" v-model="password" placeholder="Пароль" @keyup.enter="checkAuth" />
            <button class="btn-primary w-full" @click="checkAuth">Войти</button>
            <div v-if="errorMsg" class="auth-error">{{ errorMsg }}</div>
          </div>
        </div>

        <!-- Основной интерфейс -->
        <div v-else class="admin-content">

          <!-- САЙДБАР -->
          <nav class="side-nav">
            <button :class="{ active: activeTab === 'stock' }" @click="activeTab = 'stock'">
              <svg class="nav-ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
              <span class="nav-label">Склад</span>
              <span class="nav-count">{{ stockItems.length }}</span>
            </button>
            <button :class="{ active: activeTab === 'treasury' }" @click="activeTab = 'treasury'">
              <svg class="nav-ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="12" cy="12" r="10"/>
                <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/>
                <path d="M12 18V6"/>
              </svg>
              <span class="nav-label">Казна</span>
            </button>
            <button :class="{ active: activeTab === 'crafts' }" @click="activeTab = 'crafts'">
              <svg class="nav-ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
              </svg>
              <span class="nav-label">Крафты</span>
              <span class="nav-count" :class="{ ready: craftableIds.length > 0 }">{{ craftableIds.length }}</span>
            </button>
          </nav>

          <!-- ЛЕВАЯ ЧАСТЬ -->
          <main class="main-section">

            <!-- ===== СКЛАД ===== -->
            <div v-if="activeTab === 'stock'" class="tab-content">
              <div class="kpi-row">
                <div class="kpi">
                  <span class="kpi-label">Позиций</span>
                  <b class="kpi-value">{{ stockItems.length }}</b>
                </div>
                <div class="kpi">
                  <span class="kpi-label">Всего единиц</span>
                  <b class="kpi-value">{{ totalUnits }}</b>
                </div>
                <div class="kpi">
                  <span class="kpi-label">Нулевых</span>
                  <b class="kpi-value" :class="{ warn: emptyCount > 0 }">{{ emptyCount }}</b>
                </div>
                <div class="kpi">
                  <span class="kpi-label">Казна</span>
                  <b class="kpi-value accent">{{ treasury.total }}</b>
                </div>
              </div>

              <div class="card form-card">
                <div class="form-row">
                  <div class="input-group">
                    <label>Тип</label>
                    <select v-model="newItem.type">
                      <option value="" disabled>Выбрать</option>
                      <option v-for="t in filterTags" :key="t" :value="t">{{ t }}</option>
                    </select>
                  </div>
                  <div class="input-group wide">
                    <label>Название</label>
                    <input v-model="newItem.name" list="stock-names" type="text" placeholder="Например: Железный меч" @keyup.enter="addStockItem" />
                    <datalist id="stock-names">
                      <option v-for="name in uniqueStockNames" :key="name" :value="name"></option>
                    </datalist>
                  </div>
                  <div class="input-group narrow">
                    <label>Кол-во</label>
                    <input v-model.number="newItem.quantity" type="number" min="1" @keyup.enter="addStockItem" />
                  </div>
                  <button class="btn-primary" @click="addStockItem" :disabled="addingItem">Добавить</button>
                  <button class="btn-secondary" @click="openBatchModal">Партией</button>
                </div>
              </div>

              <div class="toolbar">
                <div class="filter-tags">
                  <button class="tag" :class="{ active: activeTypeFilter === '' && !showEmptyOnly }"
                    @click="activeTypeFilter = ''; showEmptyOnly = false">Все</button>
                  <button v-for="tag in filterTags" :key="tag" class="tag"
                    :class="{ active: activeTypeFilter === tag }"
                    @click="activeTypeFilter = activeTypeFilter === tag ? '' : tag">{{ tag }}</button>
                  <button class="tag" :class="{ active: showEmptyOnly }"
                    @click="showEmptyOnly = !showEmptyOnly; activeTypeFilter = ''">Нулевые</button>
                </div>
                <input type="text" v-model="stockSearch" placeholder="Поиск..." class="search-input" />
              </div>

              <!-- Сетка склада: собственный скролл -->
              <div class="stock-grid scroll-area">
                <div v-for="item in filteredStock" :key="item.id" class="stock-card" :class="{ depleted: item.quantity === 0 }">
                  <div class="stock-head">
                    <span class="stock-type">{{ item.tape }}</span>
                    <span class="badge" :class="item.quantity > 0 ? 'badge-ok' : 'badge-danger'">{{ item.quantity }}</span>
                  </div>
                  <div class="stock-name">{{ item.name }}</div>
                  <div class="stock-date">{{ item.date }}</div>
                  <div class="stock-actions">
                    <button class="btn-icon" @click="openIncreaseDialog(item)" title="Добавить">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </button>
                    <button class="btn-icon" @click="openDecreaseDialog(item)" title="Убавить">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </button>
                    <button class="btn-icon sell" @click="openSellDialog(item)" title="Продать">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>
                    </button>
                  </div>
                </div>
                <div v-if="filteredStock.length === 0" class="empty">Нет предметов</div>
              </div>
            </div>

            <!-- ===== КАЗНА ===== -->
            <div v-if="activeTab === 'treasury'" class="tab-content">
              <div class="wallet-card">
                <div class="wallet-label">Текущий баланс</div>
                <div class="wallet-value">{{ treasury.total }} <span>монет</span></div>
              </div>

              <div class="grid-2col">
                <div class="card">
                  <h4 class="card-title text-gold">Пополнение</h4>
                  <div class="input-group mb-2">
                    <input type="number" v-model.number="incomeAmount" placeholder="Сумма" />
                  </div>
                  <div class="input-group mb-2">
                    <input type="text" v-model="incomeNote" placeholder="Комментарий" @keyup.enter="addIncome" />
                  </div>
                  <button class="btn-primary w-full" @click="addIncome" :disabled="processingFinance">Добавить</button>
                </div>
                <div class="card">
                  <h4 class="card-title text-danger">Списание</h4>
                  <div class="input-group mb-2">
                    <input type="number" v-model.number="expenseAmount" placeholder="Сумма" />
                  </div>
                  <div class="input-group mb-2">
                    <input type="text" v-model="expenseNote" placeholder="Комментарий" @keyup.enter="addExpense" />
                  </div>
                  <button class="btn-primary danger w-full" @click="addExpense" :disabled="processingFinance">Списать</button>
                </div>
              </div>

              <h4 class="section-title">История операций</h4>
              <!-- Таблица: собственный скролл + залипающая шапка -->
              <div class="table-wrapper scroll-area">
                <table class="data-table">
                  <thead><tr><th>Дата</th><th>Тип</th><th>Сумма</th><th>Комментарий</th></tr></thead>
                  <tbody>
                    <tr v-for="op in treasury.history" :key="op.id">
                      <td class="text-muted">{{ op.date }}</td>
                      <td>
                        <span class="badge" :class="op.type === 'income' ? 'badge-ok' : 'badge-danger'">
                          {{ op.type === 'income' ? 'Приход' : 'Расход' }}
                        </span>
                      </td>
                      <td class="font-bold" :class="op.type === 'income' ? 'text-gold' : 'text-danger'">
                        {{ op.type === 'income' ? '+' : '-' }}{{ op.amount }}
                      </td>
                      <td class="text-muted">{{ op.note || '—' }}</td>
                    </tr>
                    <tr v-if="treasury.history.length === 0"><td colspan="4" class="empty">Нет операций</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- ===== КРАФТЫ ===== -->
            <div v-if="activeTab === 'crafts'" class="tab-content">
              <div class="crafts-toolbar">
                <h4 class="section-title" style="margin:0">Рецепты</h4>
                <button class="btn-primary" @click="toggleRecipeForm">{{ showRecipeForm ? 'Отмена' : '+ Рецепт' }}</button>
              </div>

              <div v-if="showRecipeForm" class="card recipe-form-wide">
                <input v-model="newRecipe.name" type="text" placeholder="Название предмета" class="mb-2" />
                
                <!-- Ряды ингредиентов теперь строго в одну строку -->
                <div v-for="(ing, idx) in newRecipe.ingredients" :key="idx" class="ingredient-row">
                  <select v-model="ing.name">
                    <option value="" disabled>Выбрать предмет</option>
                    <option v-for="item in uniqueStockNames" :key="item" :value="item">{{ item }}</option>
                  </select>
                  <input type="number" v-model.number="ing.quantity" min="1" />
                  <button class="btn-icon danger" @click="removeRecipeIngredient(idx)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
                
                <button class="btn-secondary text-sm w-full" @click="addRecipeIngredient">+ Ингредиент</button>
                <div class="form-actions">
                  <button class="btn-secondary" @click="showRecipeForm = false">Отмена</button>
                  <button class="btn-primary" @click="saveRecipe">Сохранить</button>
                </div>
              </div>

              <!-- Сетка рецептов: собственный скролл -->
              <div class="recipe-grid scroll-area">
                <div v-for="recipe in allRecipes" :key="recipe.id" class="recipe-card" :class="{ 'can-craft': craftableIds.includes(recipe.id) }">
                  <div class="recipe-top">
                    <div class="recipe-name">
                      {{ recipe.name }}
                      <span v-if="craftableIds.includes(recipe.id)" class="badge badge-ok">Готово</span>
                    </div>
                    <button class="btn-icon danger" @click="deleteRecipe(recipe.id)" title="Удалить рецепт">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                  <div class="recipe-ings">
                    <span v-for="(ing, i) in recipe.ingredients" :key="i" class="ing-tag"
                      :class="{ missing: !hasEnough(ing) }">
                      {{ ing.name }} x{{ ing.quantity }}
                      <em v-if="!hasEnough(ing)">({{ stockQty(ing.name) }})</em>
                    </span>
                  </div>
                  <button class="btn-primary craft-btn" :disabled="!craftableIds.includes(recipe.id)"
                    @click="openCraftDialog(recipe)">
                    Скрафтить
                  </button>
                </div>
                <div v-if="allRecipes.length === 0" class="empty-state">Рецептов пока нет</div>
              </div>
            </div>
          </main>

          <!-- ПРАВАЯ ЧАСТЬ -->
          <aside class="craft-section" v-if="activeTab !== 'crafts'">
            <div class="craft-header">
              <h3>Крафты</h3>
              <button class="btn-icon" @click="activeTab = 'crafts'" title="Все рецепты">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg>
              </button>
            </div>

            <div class="recipe-list scroll-area">
              <div v-for="recipe in allRecipes" :key="recipe.id" class="recipe-card" :class="{ 'can-craft': craftableIds.includes(recipe.id) }">
                <div class="recipe-top">
                  <div class="recipe-name">
                    {{ recipe.name }}
                    <span v-if="craftableIds.includes(recipe.id)" class="badge badge-ok">Готово</span>
                  </div>
                </div>
                <div class="recipe-ings">
                  <span v-for="(ing, i) in recipe.ingredients" :key="i" class="ing-tag"
                    :class="{ missing: !hasEnough(ing) }">
                    {{ ing.name }} x{{ ing.quantity }}
                  </span>
                </div>
                <button class="btn-primary craft-btn" :disabled="!craftableIds.includes(recipe.id)"
                  @click="openCraftDialog(recipe)">
                  Скрафтить
                </button>
              </div>
              <div v-if="allRecipes.length === 0" class="empty-state">Рецептов пока нет</div>
            </div>
          </aside>

        </div>
      </div>
    </div>

    <!-- ========== МОДАЛКИ ========== -->
    <!-- Партия -->
    <div v-if="batchModalVisible" class="modal-overlay nested" @click.self="closeBatchModal">
      <div class="modal-card">
        <h3>Добавить партией</h3>
        <div class="batch-list scroll-area">
          <!-- Ряды партии теперь строго в одну строку -->
          <div v-for="(item,idx) in batchItems" :key="idx" class="batch-row">
            <select v-model="item.type">
              <option value="" disabled>Тип</option>
              <option v-for="t in filterTags" :value="t">{{ t }}</option>
            </select>
            <input v-model="item.name" list="stock-names" type="text" placeholder="Название" />
            <input v-model.number="item.quantity" type="number" min="1" placeholder="Кол-во" />
            <button class="btn-icon danger" @click="removeBatchRow(idx)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
        <button class="btn-secondary mb-4 w-full" @click="addBatchRow">+ Строка</button>
        <div class="form-actions">
          <button class="btn-secondary" @click="closeBatchModal">Отмена</button>
          <button class="btn-primary" @click="submitBatch" :disabled="batchSubmitting">Сохранить всё</button>
        </div>
      </div>
    </div>

    <!-- Продажа -->
    <div v-if="sellDialog.visible" class="modal-overlay nested" @click.self="closeSellDialog">
      <div class="modal-card">
        <h3>Продажа: {{ sellDialog.itemName }}</h3>
        <div class="input-group"><label>Кол-во (макс. {{ sellDialog.maxQuantity }})</label><input type="number" v-model.number="sellDialog.quantity" /></div>
        <div class="input-group"><label>Сумма</label><input type="number" v-model.number="sellDialog.amount" /></div>
        <div v-if="sellDialog.error" class="auth-error">{{ sellDialog.error }}</div>
        <div class="form-actions">
          <button class="btn-secondary" @click="closeSellDialog">Отмена</button>
          <button class="btn-primary" @click="confirmSell">Продать</button>
        </div>
      </div>
    </div>

    <!-- Крафт -->
    <div v-if="craftDialog.visible" class="modal-overlay nested" @click.self="closeCraftDialog">
      <div class="modal-card">
        <h3>Скрафтить: {{ craftDialog.recipeName }}</h3>
        <div class="craft-preview">
          <span v-for="(ing, i) in craftDialog.ingredients" :key="i" class="ing-tag"
            :class="{ missing: stockQty(ing.name) < ing.quantity * craftDialog.quantity }">
            {{ ing.name }} x{{ ing.quantity * craftDialog.quantity }}
            <em>({{ stockQty(ing.name) }})</em>
          </span>
        </div>
        <div class="input-group mb-2">
          <label>Тип создаваемого предмета</label>
          <select v-model="craftDialog.type">
            <option value="" disabled>Выбрать</option>
            <option v-for="t in filterTags" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>
        <div class="input-group mb-2">
          <label>Кол-во</label>
          <input type="number" v-model.number="craftDialog.quantity" min="1" />
        </div>
        <div v-if="craftDialog.error" class="auth-error">{{ craftDialog.error }}</div>
        <div class="form-actions">
          <button class="btn-secondary" @click="closeCraftDialog">Отмена</button>
          <button class="btn-primary" @click="confirmCraft" :disabled="craftDialog.processing">Создать</button>
        </div>
      </div>
    </div>

    <!-- Инкремент -->
    <div v-if="increaseDialog.visible" class="modal-overlay nested" @click.self="closeIncreaseDialog">
      <div class="modal-card">
        <h3>Добавить: {{ increaseDialog.itemName }}</h3>
        <div class="input-group"><label>Кол-во</label><input type="number" v-model.number="increaseDialog.quantity" /></div>
        <div class="form-actions">
          <button class="btn-secondary" @click="closeIncreaseDialog">Отмена</button>
          <button class="btn-primary" @click="confirmIncrease">Применить</button>
        </div>
      </div>
    </div>

    <!-- Декремент -->
    <div v-if="decreaseDialog.visible" class="modal-overlay nested" @click.self="closeDecreaseDialog">
      <div class="modal-card">
        <h3>Убавить: {{ decreaseDialog.itemName }}</h3>
        <div class="input-group"><label>Кол-во (макс. {{ decreaseDialog.maxQuantity }})</label><input type="number" v-model.number="decreaseDialog.quantity" /></div>
        <div class="form-actions">
          <button class="btn-secondary" @click="closeDecreaseDialog">Отмена</button>
          <button class="btn-primary danger" @click="confirmDecrease">Списать</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'

const props = defineProps({ visible: Boolean })
const emit = defineEmits(['close'])

const API_BASE = 'https://89.127.206.247.nip.io';
const LOGIN = "ЯЩЕР"
const PASSWORD = "1234"

const authenticated = ref(false)
const login = ref("")
const password = ref("")
const errorMsg = ref("")
const isLoading = ref(false)
const activeTab = ref("stock")
let autoUpdateInterval = null

const stockItems = ref([])
const treasury = ref({ total: 0, history: [] })
const allRecipes = ref([])
const craftableIds = ref([])

const filterTags = ["Оружие", "Расходник", "Ресурс"]
const activeTypeFilter = ref("")
const showEmptyOnly = ref(false)
const stockSearch = ref("")
const newItem = ref({ type: "Ресурс", name: "", quantity: 1 })
const addingItem = ref(false)

const incomeAmount = ref(null)
const expenseAmount = ref(null)
const incomeNote = ref("")
const expenseNote = ref("")
const processingFinance = ref(false)

const showRecipeForm = ref(false)
const newRecipe = ref({ name: "", ingredients: [{ name: "", quantity: 1 }] })
const uniqueStockNames = computed(() => [...new Set(stockItems.value.map(i => i.name))])

const sellDialog = ref({ visible: false, itemId: null, itemName: "", maxQuantity: 0, quantity: 1, amount: 0, error: "" })
const increaseDialog = ref({ visible: false, itemId: null, itemName: "", itemType: "", quantity: 1 })
const decreaseDialog = ref({ visible: false, itemId: null, itemName: "", maxQuantity: 0, quantity: 1 })
const batchModalVisible = ref(false)
const batchItems = ref([])
const batchSubmitting = ref(false)
const craftDialog = ref({ visible: false, recipeId: null, recipeName: "", ingredients: [], type: "", quantity: 1, error: "", processing: false })

function getCanonicalName(inputName) {
  if (!inputName || !inputName.trim()) return "";
  const lower = inputName.trim().toLowerCase();
  const found = stockItems.value.find(i => i.name.toLowerCase() === lower);
  return found ? found.name : inputName.trim();
}

async function fetchData() {
  isLoading.value = true
  try {
    const [accRes, recsRes, craftRes] = await Promise.all([
      fetch(`${API_BASE}/api/accounting`),
      fetch(`${API_BASE}/api/recipes`),
      fetch(`${API_BASE}/api/recipes/craftable`)
    ]);
    const acc = await accRes.json()
    stockItems.value = acc.stock || []
    treasury.value = { total: acc.total || 0, history: acc.history || [] }
    allRecipes.value = await recsRes.json()
    const craftable = await craftRes.json()
    craftableIds.value = craftable.map(c => c.id)
  } catch (e) { console.error(e); errorMsg.value = "Ошибка загрузки данных" } finally { isLoading.value = false }
}

function checkAuth() {
  if (login.value === LOGIN && password.value === PASSWORD) {
    authenticated.value = true
    fetchData()
    errorMsg.value = ""
    if (autoUpdateInterval) clearInterval(autoUpdateInterval)
    autoUpdateInterval = setInterval(() => { if (authenticated.value) fetchData() }, 30000)
  } else {
    errorMsg.value = "Неверный логин или пароль"
    password.value = ""
  }
}

async function addStockItem() {
  if (!newItem.value.name || newItem.value.quantity < 1) return alert("Заполните название и количество")
  addingItem.value = true
  const canonicalName = getCanonicalName(newItem.value.name)
  try {
    await fetch(`${API_BASE}/api/accounting/stock`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'addStock', type: newItem.value.type, name: canonicalName, quantity: newItem.value.quantity })
    })
    await fetchData()
    newItem.value.name = ""
    newItem.value.quantity = 1
  } catch (e) { alert("Ошибка при добавлении") } finally { addingItem.value = false }
}

async function addIncome() {
  if (!incomeAmount.value) return
  processingFinance.value = true
  await fetch(`${API_BASE}/api/accounting/finance`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'addIncome', amount: incomeAmount.value, note: incomeNote.value })
  })
  await fetchData(); incomeAmount.value = null; incomeNote.value = ""; processingFinance.value = false
}

async function addExpense() {
  if (!expenseAmount.value) return
  processingFinance.value = true
  await fetch(`${API_BASE}/api/accounting/finance`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'addExpense', amount: expenseAmount.value, note: expenseNote.value })
  })
  await fetchData(); expenseAmount.value = null; expenseNote.value = ""; processingFinance.value = false
}

async function saveRecipe() {
  if (!newRecipe.value.name.trim()) return alert("Введите название")
  const validIngs = newRecipe.value.ingredients.filter(i => i.name && i.quantity > 0)
  if (!validIngs.length) return alert("Добавьте ингредиенты")
  await fetch(`${API_BASE}/api/recipes`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: newRecipe.value.name, ingredients: validIngs })
  })
  await fetchData()
  showRecipeForm.value = false
  newRecipe.value = { name: "", ingredients: [{ name: "", quantity: 1 }] }
}

async function deleteRecipe(id) {
  if (!confirm("Вы уверены, что хотите удалить этот рецепт?")) return;
  await fetch(`${API_BASE}/api/recipes/${id}`, { method: 'DELETE' });
  await fetchData();
}

function toggleRecipeForm() {
  showRecipeForm.value = !showRecipeForm.value
  if (showRecipeForm.value) newRecipe.value = { name: "", ingredients: [{ name: "", quantity: 1 }] }
}
function addRecipeIngredient() { newRecipe.value.ingredients.push({ name: "", quantity: 1 }) }
function removeRecipeIngredient(i) { newRecipe.value.ingredients.splice(i, 1) }

function openSellDialog(item) { sellDialog.value = { visible: true, itemId: item.id, itemName: item.name, maxQuantity: item.quantity, quantity: 1, amount: 0, error: "" } }
function closeSellDialog() { sellDialog.value.visible = false }
async function confirmSell() {
  if (sellDialog.value.quantity > sellDialog.value.maxQuantity) return sellDialog.value.error = "Недостаточно товара"
  await fetch(`${API_BASE}/api/accounting/stock`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'sellItem', id: sellDialog.value.itemId, quantity: sellDialog.value.quantity, amount: sellDialog.value.amount })
  })
  await fetchData(); closeSellDialog()
}

function openIncreaseDialog(item) { increaseDialog.value = { visible: true, itemId: item.id, itemName: item.name, itemType: item.tape, quantity: 1 } }
function closeIncreaseDialog() { increaseDialog.value.visible = false }
async function confirmIncrease() {
  await fetch(`${API_BASE}/api/accounting/stock`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'addStock', type: increaseDialog.value.itemType, name: increaseDialog.value.itemName, quantity: increaseDialog.value.quantity })
  })
  await fetchData(); closeIncreaseDialog()
}

function openDecreaseDialog(item) { decreaseDialog.value = { visible: true, itemId: item.id, itemName: item.name, maxQuantity: item.quantity, quantity: 1 } }
function closeDecreaseDialog() { decreaseDialog.value.visible = false }
async function confirmDecrease() {
  await fetch(`${API_BASE}/api/accounting/stock`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'removeItem', id: decreaseDialog.value.itemId, quantity: decreaseDialog.value.quantity })
  })
  await fetchData(); closeDecreaseDialog()
}

function openCraftDialog(recipe) {
  craftDialog.value = { visible: true, recipeId: recipe.id, recipeName: recipe.name, ingredients: recipe.ingredients || [], type: "", quantity: 1, error: "", processing: false }
}
function closeCraftDialog() { craftDialog.value.visible = false }

async function confirmCraft() {
  const d = craftDialog.value
  if (!d.type) return d.error = "Выберите тип предмета"
  if (!d.quantity || d.quantity < 1) return d.error = "Укажите количество"
  const lacking = d.ingredients.filter(ing => stockQty(ing.name) < ing.quantity * d.quantity)
  if (lacking.length) return d.error = "Недостаточно: " + lacking.map(i => i.name).join(", ")
  d.processing = true
  d.error = ""
  try {
    const res = await fetch(`${API_BASE}/api/recipes/${d.recipeId}/craft`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: d.type, quantity: d.quantity })
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok || json.error) throw new Error(json.error || `HTTP ${res.status}`)
    await fetchData()
    closeCraftDialog()
  } catch (e) {
    d.error = "Ошибка крафта: " + e.message
  } finally {
    d.processing = false
  }
}

function openBatchModal() { batchItems.value = [{ type: "Ресурс", name: "", quantity: 1 }]; batchModalVisible.value = true }
function closeBatchModal() { batchModalVisible.value = false }
function addBatchRow() { batchItems.value.push({ type: "Ресурс", name: "", quantity: 1 }) }
function removeBatchRow(i) { batchItems.value.splice(i, 1) }
async function submitBatch() {
  const valid = batchItems.value.filter(i => i.name && i.quantity > 0)
  if (!valid.length) return
  const normalized = valid.map(i => ({ ...i, name: getCanonicalName(i.name) }))
  batchSubmitting.value = true
  await fetch(`${API_BASE}/api/accounting/stock`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'addStockBatch', items: JSON.stringify(normalized) })
  })
  await fetchData(); closeBatchModal(); batchSubmitting.value = false
}

function refreshData() { fetchData() }

const filteredStock = computed(() => {
  let f = stockItems.value
  if (showEmptyOnly.value) f = f.filter(i => i.quantity === 0)
  else {
    f = f.filter(i => i.quantity > 0)
    if (activeTypeFilter.value) f = f.filter(i => i.tape === activeTypeFilter.value)
  }
  if (stockSearch.value) f = f.filter(i => i.name.toLowerCase().includes(stockSearch.value.toLowerCase()))
  return f.sort((a,b) => b.id - a.id)
})

const totalUnits = computed(() => stockItems.value.reduce((s, i) => s + (i.quantity || 0), 0))
const emptyCount = computed(() => stockItems.value.filter(i => i.quantity === 0).length)
const incomeTotal = computed(() => treasury.value.history.filter(o => o.type === 'income').reduce((s, o) => s + o.amount, 0))
const expenseTotal = computed(() => treasury.value.history.filter(o => o.type === 'expense').reduce((s, o) => s + o.amount, 0))

function stockQty(name) {
  const found = stockItems.value.find(i => i.name.toLowerCase() === String(name).toLowerCase())
  return found ? found.quantity : 0
}
function hasEnough(ing) { return stockQty(ing.name) >= ing.quantity }

watch(() => props.visible, (val) => {
  if (!val) {
    authenticated.value = false; login.value = ""; password.value = ""
    if (autoUpdateInterval) { clearInterval(autoUpdateInterval); autoUpdateInterval = null }
  }
})
onBeforeUnmount(() => { if (autoUpdateInterval) clearInterval(autoUpdateInterval) })
function close() { emit('close') }
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap");

.acct-root {
  --bg-app: #141414;
  --bg-panel: #1e1e1e;
  --bg-input: #262626;
  --border: rgba(255, 255, 255, 0.15);
  --border-strong: rgba(255, 255, 255, 0.3);
  --text: #e0e0e0;
  --muted: #a0a0a0;
  --gold: #e8c8a0;
  --gold-dim: rgba(232, 200, 160, 0.14);
  --gold-border: rgba(232, 200, 160, 0.35);
  --red: #ef6a6a;
  --red-dim: rgba(185, 28, 28, 0.2);

  color-scheme: dark;
  font-family: 'Crimson Text', serif;
  color: var(--text);
}

.modal-overlay {
  position: fixed; inset: 0;
  background: var(--bg-app);
  z-index: 10000;
  display: flex; align-items: center; justify-content: center;
}
.admin-panel {
  width: 100vw; height: 100vh; background: var(--bg-app);
  display: flex; flex-direction: column; overflow: hidden;
}

/* ===== СКРОЛЛБАРЫ ===== */
.scroll-area { overflow-y: auto; min-height: 0; }
.scroll-area::-webkit-scrollbar { width: 7px; }
.scroll-area::-webkit-scrollbar-track { background: transparent; }
.scroll-area::-webkit-scrollbar-thumb { background: rgba(232, 200, 160, 0.22); border-radius: 4px; }
.scroll-area::-webkit-scrollbar-thumb:hover { background: rgba(232, 200, 160, 0.45); }
.scroll-area { scrollbar-width: thin; scrollbar-color: rgba(232,200,160,0.25) transparent; }

/* ===== ШАПКА ===== */
.admin-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 24px; background: var(--bg-panel);
  border-bottom: 1px solid var(--border); flex-shrink: 0;
}
.header-left { display: flex; align-items: center; gap: 14px; }
.header-left h2 {
  margin: 0; font-family: 'Cinzel', serif; color: var(--gold);
  font-size: 20px; font-weight: 700; letter-spacing: 0.04em;
}
.status-badge {
  background: var(--gold-dim); color: var(--gold);
  padding: 4px 10px; border: 1px solid var(--gold-border);
  border-radius: 6px; font-size: 10px; font-weight: 700;
  letter-spacing: 0.12em; text-transform: uppercase; font-family: 'Cinzel', serif;
}
.header-right { display: flex; gap: 10px; align-items: center; }
.btn-refresh, .btn-close {
  background: var(--bg-input); border: 1px solid var(--border); color: var(--muted);
  border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 8px;
  font-family: 'Cinzel', serif; font-size: 11px; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase; transition: all 0.2s ease;
}
.btn-refresh { padding: 8px 14px; }
.btn-close { padding: 8px; }
.btn-refresh:hover, .btn-close:hover { border-color: var(--gold-border); color: var(--gold); }
.btn-refresh:disabled { opacity: 0.4; cursor: not-allowed; }
.icon.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ===== АВТОРИЗАЦИЯ ===== */
.auth-screen { flex: 1; display: flex; align-items: center; justify-content: center; }
.auth-card {
  background: var(--bg-panel); padding: 36px; border-radius: 10px;
  border: 1px solid var(--border); width: 360px; text-align: center;
}
.auth-card h3 { margin: 0 0 6px; font-family: 'Cinzel', serif; color: var(--gold); font-size: 22px; font-weight: 700; }
.auth-card p { color: var(--muted); margin-bottom: 24px; font-size: 14px; }
.auth-card input {
  width: 100%; padding: 12px 14px; background: var(--bg-input); border: 1px solid var(--border);
  border-radius: 6px; color: var(--text); margin-bottom: 14px; font-size: 15px; outline: none;
  transition: border-color 0.2s; font-family: 'Crimson Text', serif; box-sizing: border-box;
}
.auth-card input::placeholder { color: var(--muted); }
.auth-card input:focus { border-color: var(--gold-border); }
.auth-error {
  color: var(--red); font-size: 13px; margin-top: 14px; font-weight: 600;
  background: var(--red-dim); padding: 8px 10px; border-radius: 6px; border: 1px solid rgba(239,106,106,0.25);
}

/* ===== КАРКАС ===== */
.admin-content { flex: 1; display: grid; grid-template-columns: 200px 1fr 300px; overflow: hidden; min-height: 0; }
.main-section {
  padding: 20px 24px; overflow: hidden; min-height: 0;
  border-right: 1px solid var(--border); background: var(--bg-app);
  display: flex; flex-direction: column;
}
.tab-content { display: flex; flex-direction: column; flex: 1; min-height: 0; gap: 16px; }
.craft-section { background: var(--bg-panel); display: flex; flex-direction: column; overflow: hidden; min-height: 0; }

/* ===== САЙДБАР ===== */
.side-nav { background: var(--bg-panel); border-right: 1px solid var(--border); padding: 16px 10px; display: flex; flex-direction: column; gap: 4px; }
.side-nav button {
  display: flex; align-items: center; gap: 10px; width: 100%;
  background: transparent; border: 1px solid transparent; border-radius: 6px;
  padding: 10px 12px; color: var(--muted); cursor: pointer; transition: all 0.2s ease;
  font-family: 'Cinzel', serif; font-size: 12px; font-weight: 600; text-align: left;
  letter-spacing: 0.06em; text-transform: uppercase;
}
.side-nav button:hover { color: var(--text); background: var(--bg-input); }
.side-nav button.active { background: var(--gold-dim); color: var(--gold); border-color: var(--gold-border); }
.nav-ico { opacity: 0.7; flex-shrink: 0; }
.side-nav button.active .nav-ico { opacity: 1; }
.nav-label { flex: 1; }
.nav-count {
  background: var(--bg-input); color: var(--muted); font-size: 11px; padding: 1px 7px;
  border-radius: 10px; font-weight: 700; border: 1px solid var(--border);
}
.nav-count.ready { background: var(--gold-dim); color: var(--gold); border-color: var(--gold-border); }

/* ===== KPI ===== */
.kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; flex-shrink: 0; }
.kpi {
  background: var(--bg-panel); border: 1px solid var(--border); border-radius: 8px;
  padding: 12px 16px; display: flex; flex-direction: column; gap: 4px;
}
.kpi-label { font-family: 'Cinzel', serif; font-size: 9px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.12em; font-weight: 700; }
.kpi-value { font-family: 'Cinzel', serif; font-size: 22px; color: var(--text); font-weight: 700; line-height: 1; }
.kpi-value.warn { color: var(--red); }
.kpi-value.accent { color: var(--gold); }

/* ===== ФОРМЫ / КАРТОЧКИ ===== */
.card { background: var(--bg-panel); border: 1px solid var(--border); border-radius: 8px; padding: 16px; flex-shrink: 0; }
.form-row { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; }
.input-group { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 110px; }
.input-group.wide { flex: 2; }
.input-group.narrow { flex: 0.4; min-width: 70px; }
.input-group label { font-family: 'Cinzel', serif; font-size: 9px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.12em; font-weight: 700; }

/* Глобальные стили инпутов */
input, select {
  background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px;
  padding: 9px 12px; color: var(--text); font-size: 14px; outline: none;
  transition: border-color 0.2s; width: 100%; font-family: 'Crimson Text', serif; box-sizing: border-box;
}
input::placeholder { color: var(--muted); }
input:focus, select:focus { border-color: var(--gold-border); }

.btn-primary {
  background: var(--gold); border: 1px solid var(--gold); padding: 9px 18px;
  border-radius: 6px; color: #1e1e1e; font-weight: 700; cursor: pointer;
  transition: all 0.2s ease; height: 38px; font-size: 12px;
  letter-spacing: 0.08em; text-transform: uppercase; font-family: 'Cinzel', serif;
}
.btn-primary:hover { background: transparent; color: var(--gold); }
.btn-primary.danger { background: #b91c1c; border-color: #b91c1c; color: #fff; }
.btn-primary.danger:hover { background: transparent; color: var(--red); }
.btn-primary:disabled { opacity: 0.35; cursor: not-allowed; }
.btn-secondary {
  background: transparent; border: 1px solid var(--border); padding: 9px 18px;
  border-radius: 6px; color: var(--muted); cursor: pointer; transition: all 0.2s ease;
  height: 38px; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase;
  font-weight: 700; font-family: 'Cinzel', serif;
}
.btn-secondary:hover { border-color: var(--gold-border); color: var(--gold); }

/* ===== ТУЛБАР ===== */
.toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; flex-shrink: 0; }
.filter-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.tag {
  background: transparent; border: 1px solid var(--border); padding: 7px 12px; border-radius: 6px;
  color: var(--muted); cursor: pointer; font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase;
  transition: all 0.2s ease; font-weight: 600; font-family: 'Cinzel', serif;
}
.tag:hover { border-color: var(--border-strong); color: var(--text); }
.tag.active { background: var(--gold); color: #1e1e1e; border-color: var(--gold); font-weight: 700; }
.search-input { width: 220px; }

/* ===== СКЛАД ===== */
.stock-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 12px; align-content: start; flex: 1; padding-right: 6px;
}
.stock-card {
  background: var(--bg-panel); border: 1px solid var(--border); border-radius: 8px;
  padding: 12px 14px; display: flex; flex-direction: column; gap: 6px;
  transition: border-color 0.2s ease;
}
.stock-card:hover { border-color: var(--gold-border); }
.stock-card.depleted { border-color: rgba(239,106,106,0.4); }
.stock-card.depleted .stock-name { color: var(--muted); }
.stock-head { display: flex; justify-content: space-between; align-items: center; }
.stock-type {
  font-family: 'Cinzel', serif; font-size: 9px; color: var(--muted); text-transform: uppercase;
  letter-spacing: 0.1em; font-weight: 700; background: var(--bg-input); padding: 2px 6px; border-radius: 4px;
}
.stock-name { font-weight: 600; color: var(--text); font-size: 16px; line-height: 1.2; }
.stock-date { font-size: 11px; color: var(--muted); }
.stock-actions { display: flex; gap: 6px; margin-top: 4px; }

/* ===== БЕЙДЖИ / ИКОНКИ ===== */
.badge { padding: 2px 8px; border-radius: 5px; font-size: 10px; font-weight: 700; letter-spacing: 0.04em; font-family: 'Cinzel', serif; }
.badge-ok { background: var(--gold-dim); color: var(--gold); border: 1px solid var(--gold-border); }
.badge-danger { background: var(--red-dim); color: var(--red); border: 1px solid rgba(239,106,106,0.3); }
.text-gold { color: var(--gold); }
.text-danger { color: var(--red); }
.text-muted { color: var(--muted); }
.font-bold { font-weight: 600; color: var(--text); }
.btn-icon {
  width: 28px; height: 28px; border-radius: 6px; background: var(--bg-input);
  border: 1px solid var(--border); color: var(--muted); cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; flex-shrink: 0;
}
.btn-icon:hover { border-color: var(--gold-border); color: var(--gold); }
.btn-icon.sell { color: var(--gold); border-color: var(--gold-border); }
.btn-icon.danger { color: var(--red); }
.btn-icon.danger:hover { border-color: var(--red); background: var(--red-dim); color: var(--red); }
.empty { grid-column: 1 / -1; text-align: center; padding: 32px; color: var(--muted); font-style: italic; font-size: 14px; }

/* ===== КАЗНА ===== */
.wallet-card {
  background: var(--bg-panel); border: 1px solid var(--border); border-radius: 8px;
  padding: 20px; text-align: center; position: relative; overflow: hidden; flex-shrink: 0;
}
.wallet-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: var(--gold); opacity: 0.6; }
.wallet-label { color: var(--muted); font-family: 'Cinzel', serif; font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 8px; font-weight: 700; }
.wallet-value { font-family: 'Cinzel', serif; font-size: 38px; color: var(--gold); font-weight: 700; line-height: 1; }
.wallet-value span { font-size: 13px; color: var(--muted); font-family: 'Crimson Text', serif; font-weight: 400; margin-left: 6px; letter-spacing: 0.08em; text-transform: uppercase; }
.grid-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; flex-shrink: 0; }
.card-title { font-family: 'Cinzel', serif; font-size: 15px; margin: 0 0 12px; font-weight: 700; letter-spacing: 0.04em; }
.section-title { font-family: 'Cinzel', serif; font-size: 16px; color: var(--gold); margin-bottom: 0; font-weight: 700; letter-spacing: 0.04em; flex-shrink: 0; }

.table-wrapper { background: var(--bg-panel); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; flex: 1; }
.table-wrapper.scroll-area { overflow: auto; }
.data-table { width: 100%; border-collapse: collapse; text-align: left; }
.data-table th {
  position: sticky; top: 0; z-index: 2;
  background: var(--bg-input); padding: 10px 14px; font-family: 'Cinzel', serif;
  font-size: 10px; font-weight: 700; color: var(--muted); text-transform: uppercase;
  letter-spacing: 0.1em; border-bottom: 1px solid var(--border);
}
.data-table td { padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.07); font-size: 14px; color: var(--text); }
.data-table tr:last-child td { border-bottom: none; }
.data-table tr:hover { background: rgba(255,255,255,0.02); }

/* ===== КРАФТЫ ===== */
.crafts-toolbar { display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
.recipe-form-wide { display: flex; flex-direction: column; gap: 8px; flex-shrink: 0; }
.recipe-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px; align-content: start; flex: 1; padding-right: 6px;
}
.recipe-card {
  background: var(--bg-panel); border: 1px solid var(--border); border-radius: 8px;
  padding: 12px 14px; transition: border-color 0.2s ease;
}
.recipe-card:hover { border-color: var(--border-strong); }
.recipe-card.can-craft { border-color: var(--gold-border); background: linear-gradient(180deg, var(--gold-dim), var(--bg-panel)); }
.recipe-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; gap: 8px; }
.recipe-name { display: flex; align-items: center; gap: 8px; font-weight: 600; color: var(--text); font-size: 16px; flex-wrap: wrap; }
.recipe-ings { display: flex; flex-wrap: wrap; gap: 6px; }
.ing-tag {
  background: var(--bg-input); padding: 3px 8px; border-radius: 5px; font-size: 12px;
  color: var(--muted); border: 1px solid var(--border);
}
.ing-tag.missing { background: var(--red-dim); border-color: rgba(239,106,106,0.3); color: var(--red); }
.can-craft .ing-tag { background: var(--gold-dim); border-color: var(--gold-border); color: var(--gold); }
.can-craft .ing-tag.missing { background: var(--red-dim); border-color: rgba(239,106,106,0.3); color: var(--red); }
.ing-tag em { font-style: normal; opacity: 0.75; margin-left: 3px; }
.craft-btn { width: 100%; margin-top: 12px; height: 32px; padding: 0 12px; font-size: 11px; }
.craft-preview { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px; }

.craft-header { padding: 16px 18px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); flex-shrink: 0; }
.craft-header h3 { margin: 0; font-family: 'Cinzel', serif; color: var(--gold); font-size: 16px; font-weight: 700; letter-spacing: 0.04em; }
.recipe-list { flex: 1; padding: 14px; display: flex; flex-direction: column; gap: 10px; }
.empty-state { text-align: center; color: var(--muted); font-style: italic; margin-top: 24px; font-size: 14px; }

/* ===== МОДАЛКИ ===== */
.modal-overlay.nested { background: rgba(0, 0, 0, 0.75); z-index: 10001; }
.modal-card {
  background: var(--bg-panel); border: 1px solid var(--border-strong); border-radius: 10px;
  padding: 24px; width: 400px; max-width: 90%;
}
.modal-card h3 { margin: 0 0 18px; font-family: 'Cinzel', serif; color: var(--gold); text-align: center; font-size: 18px; font-weight: 700; }
.modal-card .input-group { margin-bottom: 12px; }
.batch-list { max-height: 280px; padding-right: 6px; }
.form-actions { display: flex; gap: 10px; margin-top: 18px; }
.form-actions button { flex: 1; }

/* ===== РЯД ИНГРЕДИЕНТА: всё в одну строку ===== */
.ingredient-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.ingredient-row select {
  flex: 1;
  min-width: 0;
  width: auto;          /* перебиваем глобальный width: 100% */
}
.ingredient-row input {
  flex: none;
  width: 64px;          /* фиксированная колонка под количество */
}
.ingredient-row .btn-icon {
  flex: none;
  width: 28px;
  height: 28px;
}

/* ===== РЯД ПАРТИИ: всё в одну строку ===== */
.batch-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.batch-row select {
  flex: 0 0 100px;
  min-width: 0;
  width: auto;
}
.batch-row input[type="text"] {
  flex: 1;
  min-width: 0;
  width: auto;
}
.batch-row input[type="number"] {
  flex: none;
  width: 64px;
}
.batch-row .btn-icon {
  flex: none;
  width: 28px;
  height: 28px;
}

/* ===== УТИЛИТЫ ===== */
.mb-2 { margin-bottom: 8px; }
.mb-4 { margin-bottom: 14px; }
.text-sm { font-size: 11px; height: 32px; }
.w-full { width: 100%; }

/* ===== АДАПТИВ ===== */
@media (max-width: 1100px) {
  .admin-content { grid-template-columns: 180px 1fr; }
  .craft-section { display: none; }
  .kpi-row { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 720px) {
  .admin-content { grid-template-columns: 1fr; }
  .side-nav { flex-direction: row; overflow-x: auto; border-right: none; border-bottom: 1px solid var(--border); padding: 10px; }
  .side-nav button { width: auto; white-space: nowrap; }
  .grid-2col, .kpi-row { grid-template-columns: 1fr; }
  .form-row { flex-direction: column; align-items: stretch; }
}
</style>