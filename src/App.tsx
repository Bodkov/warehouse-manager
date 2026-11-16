
import { useEffect, useMemo, useState } from 'react'

const categories = [
  { name: 'Водка', color: '#2878e8' },
  { name: 'Виски', color: '#16a36a' },
  { name: 'Коньяк', color: '#d69b24' },
  { name: 'Ликёр', color: '#a855f7' },
  { name: 'Вино', color: '#e34d59' },
  { name: 'Ром', color: '#0891b2' },
  { name: 'Шампанское', color: '#ec4899' },
  { name: 'Вермут', color: '#f97316' },
  { name: 'Другое', color: '#64748b' },
]

type Product = {
  id: number
  name: string
  quantity: number
  category: string
}

type Pallet = {
  id: number
  name: string
  row: number
  col: number
  products: Product[]
}

function App() {
  const [rows, setRows] = useState(5)
  const [cols, setCols] = useState(4)

  const [pallets, setPallets] = useState<Pallet[]>(() => {
    try {
      const saved = localStorage.getItem('warehouse-pallets')
      if (saved) {
        const data = JSON.parse(saved)
        if (Array.isArray(data)) {
          return data.map((p, i) => ({
            ...p,
            row: p.row ?? Math.floor(i / 4),
            col: p.col ?? i % 4,
            products: (p.products || []).map((product: Product) => ({
              ...product,
              category: product.category || 'Другое'
            }))
          }))
        }
      }
    } catch {}

    return Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      name: `Палета ${String(i + 1).padStart(2, '0')}`,
      row: Math.floor(i / 4),
      col: i % 4,
      products: []
    }))
  })

  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<number | null>(null)

  useEffect(() => {
    localStorage.setItem('warehouse-pallets', JSON.stringify(pallets))
  }, [pallets])

  const matching = (pallet: Pallet) => {
    const q = search.trim().toLowerCase()
    if (!q) return true

    return (
      pallet.name.toLowerCase().includes(q) ||
      pallet.products.some(p =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      )
    )
  }

  const totalProducts = pallets.reduce(
    (sum, p) => sum + p.products.length, 0
  )

  const totalUnits = pallets.reduce(
    (sum, p) => sum + p.products.reduce(
      (s, item) => s + item.quantity, 0
    ), 0
  )

  function getPallet(row: number, col: number) {
    return pallets.find(p => p.row === row && p.col === col)
  }

  function movePallet(target: Pallet) {
    if (selected === null) {
      setSelected(target.id)
      return
    }

    if (selected === target.id) {
      setSelected(null)
      return
    }

    setPallets(prev => {
      const first = prev.find(p => p.id === selected)
      const second = prev.find(p => p.id === target.id)
      if (!first || !second) return prev

      return prev.map(p => {
        if (p.id === first.id) {
          return { ...p, row: second.row, col: second.col }
        }
        if (p.id === second.id) {
          return { ...p, row: first.row, col: first.col }
        }
        return p
      })
    })

    setSelected(null)
  }

  function moveToEmpty(row: number, col: number) {
    if (selected === null) return

    setPallets(prev => prev.map(p =>
      p.id === selected ? { ...p, row, col } : p
    ))
    setSelected(null)
  }

  function addPallet() {
    let position: { row: number; col: number } | null = null

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!getPallet(r, c) && !position) {
          position = { row: r, col: c }
        }
      }
    }

    if (!position) {
      alert('Свободных клеток нет. Добавь ряд или колонку.')
      return
    }

    const id = Date.now()

    setPallets(prev => [
      ...prev,
      {
        id,
        name: `Палета ${String(prev.length + 1).padStart(2, '0')}`,
        row: position!.row,
        col: position!.col,
        products: []
      }
    ])
  }

  function addProduct(palletId: number) {
    const name = prompt('Название алкоголя:')
    if (!name?.trim()) return

    const category = prompt(
      'Выбери категорию:\n' +
      categories.map(c => c.name).join(', '),
      'Виски'
    )

    if (!category?.trim()) return

    const matchedCategory = categories.find(
      c => c.name.toLowerCase() === category.trim().toLowerCase()
    )

    if (!matchedCategory) {
      alert('Такой категории нет в списке')
      return
    }

    const quantity = Number(prompt('Количество:', '1'))

    if (!Number.isFinite(quantity) || quantity < 0) {
      alert('Некорректное количество')
      return
    }

    setPallets(prev => prev.map(p =>
      p.id === palletId
        ? {
            ...p,
            products: [
              ...p.products,
              {
                id: Date.now(),
                name: name.trim(),
                quantity,
                category: matchedCategory.name
              }
            ]
          }
        : p
    ))
  }

  function editProduct(palletId: number, product: Product) {
    const name = prompt('Название товара:', product.name)
    if (!name?.trim()) return

    const quantity = Number(
      prompt('Количество:', String(product.quantity))
    )

    if (!Number.isFinite(quantity) || quantity < 0) {
      alert('Некорректное количество')
      return
    }

    const category = prompt(
      'Категория:\n' + categories.map(c => c.name).join(', '),
      product.category
    )

    if (!category?.trim()) return

    const matchedCategory = categories.find(
      c => c.name.toLowerCase() === category.trim().toLowerCase()
    )

    if (!matchedCategory) {
      alert('Такой категории нет в списке')
      return
    }

    setPallets(prev => prev.map(p =>
      p.id === palletId
        ? {
            ...p,
            products: p.products.map(item =>
              item.id === product.id
                ? {
                    ...item,
                    name: name.trim(),
                    quantity,
                    category: matchedCategory.name
                  }
                : item
            )
          }
        : p
    ))
  }

  function deleteProduct(palletId: number, productId: number) {
    if (!confirm('Удалить товар?')) return

    setPallets(prev => prev.map(p =>
      p.id === palletId
        ? {
            ...p,
            products: p.products.filter(item => item.id !== productId)
          }
        : p
    ))
  }

  function deletePallet(palletId: number) {
    if (!confirm('Удалить палету вместе с товарами?')) return

    setPallets(prev => prev.filter(p => p.id !== palletId))
    setSelected(null)
  }

  function renamePallet(pallet: Pallet) {
    const name = prompt('Название палеты:', pallet.name)
    if (!name?.trim()) return

    setPallets(prev => prev.map(p =>
      p.id === pallet.id ? { ...p, name: name.trim() } : p
    ))
  }

  function colorFor(category: string) {
    return categories.find(c =>
      c.name.toLowerCase() === category.toLowerCase()
    )?.color || '#64748b'
  }

  function colorsFor(pallet: Pallet) {
    return [...new Set(pallet.products.map(p => colorFor(p.category)))]
  }

  const foundPallets = useMemo(
    () => pallets.filter(matching),
    [pallets, search]
  )

  return (
    <div className="app">
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #101722; }
        button, input { font: inherit; }
        button { cursor: pointer; }
        .app {
          min-height: 100vh; padding: 16px;
          background: #101722; color: #f1f5f9;
          font-family: Arial, sans-serif;
        }
        .wrap { max-width: 1000px; margin: auto; }
        .header {
          display: flex; justify-content: space-between;
          align-items: center; gap: 12px; margin-bottom: 22px;
        }
        .logo { font-size: 23px; font-weight: 800; }
        .muted { color: #94a3b8; font-size: 13px; margin-top: 5px; }
        .stats {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 9px; margin-bottom: 17px;
        }
        .stat {
          background: #1c2939; padding: 13px;
          border-radius: 12px; border: 1px solid #334155;
        }
        .stat small { color: #94a3b8; font-size: 11px; }
        .stat strong { display: block; font-size: 23px; margin-top: 6px; }
        .search {
          width: 100%; padding: 14px; border-radius: 12px;
          background: #1c2939; border: 1px solid #475569;
          color: white; margin-bottom: 14px; outline: none;
        }
        .actions { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 17px; }
        .btn {
          border: 0; border-radius: 9px; padding: 12px 14px;
          font-weight: 700; color: white;
        }
        .green { background: #0d9488; }
        .blue { background: #2563eb; }
        .gray { background: #334155; }
        .red { background: #862f40; }
        .board {
          background: #182333; padding: 12px;
          border: 1px solid #334155; border-radius: 15px;
        }
        .board-title {
          display: flex; justify-content: space-between;
          align-items: center; margin-bottom: 13px;
          gap: 8px; flex-wrap: wrap;
        }
        .board-title strong { font-size: 16px; }
        .board-grid { display: grid; gap: 7px; }
        .cell {
          min-width: 0; min-height: 88px;
          border-radius: 10px; position: relative;
          border: 1px dashed #475569;
          background: #111c2b; padding: 5px;
          display: flex; flex-direction: column;
          justify-content: center; align-items: center;
          color: #94a3b8;
        }
        .cell.selected {
          outline: 3px solid #5eead4;
          background: #17433f;
        }
        .cell.found { outline: 2px solid #facc15; }
        .pallet-name {
          font-size: 11px; font-weight: 800;
          text-align: center; overflow-wrap: anywhere;
          color: white; margin-top: 5px;
        }
        .pallet-icon { font-size: 23px; }
        .pallet-count { font-size: 10px; color: #cbd5e1; margin-top: 3px; }
        .stripes {
          display: flex; width: 100%; height: 7px;
          position: absolute; top: 0; left: 0;
          overflow: hidden; border-radius: 10px 10px 0 0;
        }
        .stripe { flex: 1; }
        .empty-plus { font-size: 23px; }
        .empty-label { font-size: 10px; }
        .legend {
          display: flex; flex-wrap: wrap; gap: 10px;
          margin-top: 14px;
        }
        .legend-item {
          display: flex; align-items: center;
          gap: 5px; font-size: 11px; color: #cbd5e1;
        }
        .dot { width: 10px; height: 10px; border-radius: 3px; }
        .hint {
          background: #173b3a; border: 1px solid #0f766e;
          color: #99f6e4; padding: 11px;
          border-radius: 10px; font-size: 12px;
          margin-bottom: 12px;
        }
        .details { margin-top: 20px; }
        .details-title { margin-bottom: 10px; font-weight: 800; }
        .product-card {
          background: #1c2939; border: 1px solid #334155;
          border-radius: 12px; padding: 13px; margin-bottom: 9px;
        }
        .product-top {
          display: flex; justify-content: space-between;
          gap: 10px; align-items: center;
        }
        .product-color {
          width: 9px; height: 35px; border-radius: 5px;
          flex-shrink: 0;
        }
        .product-name { font-weight: 700; overflow-wrap: anywhere; }
        .product-info { color: #94a3b8; font-size: 12px; margin-top: 5px; }
        .product-actions { display: flex; gap: 6px; margin-top: 10px; }
        .product-actions button { flex: 1; font-size: 12px; }
        .empty-note { color: #94a3b8; font-size: 13px; padding: 12px 0; }
        .footer { color: #64748b; font-size: 11px; text-align: center; margin: 24px 0; }
        @media(max-width: 420px) {
          .app { padding: 10px; }
          .board { padding: 8px; }
          .board-grid { gap: 4px !important; }
          .cell { min-height: 72px; padding: 3px; }
          .pallet-name { font-size: 9px; }
          .pallet-icon { font-size: 19px; }
          .pallet-count { font-size: 9px; }
          .stat { padding: 10px; }
          .stat strong { font-size: 20px; }
        }
      `}</style>

      <main className="wrap">
        <header className="header">
          <div>
            <div className="logo">📦 WAREHOUSE</div>
            <div className="muted">Интерактивная карта склада</div>
          </div>
          <span style={{ color: '#5eead4', fontSize: 12 }}>
            ● Режим редактирования
          </span>
        </header>

        <section className="stats">
          <div className="stat">
            <small>Всего палет</small>
            <strong>{pallets.length}</strong>
          </div>
          <div className="stat">
            <small>Виды товаров</small>
            <strong>{totalProducts}</strong>
          </div>
          <div className="stat">
            <small>Всего единиц</small>
            <strong>{totalUnits}</strong>
          </div>
        </section>

        <input
          className="search"
          placeholder="🔍 Поиск алкоголя или палеты..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <div className="actions">
          <button className="btn green" onClick={addPallet}>+ Палета</button>
          <button className="btn blue" onClick={() => setRows(r => r + 1)}>+ Ряд</button>
          <button className="btn blue" onClick={() => setCols(c => c + 1)}>+ Колонка</button>
          <button className="btn gray" onClick={() => {
            setSelected(null)
            setSearch('')
          }}>Сбросить</button>
        </div>

        {selected !== null && (
          <div className="hint">
            Палета выбрана. Нажми на свободную клетку, чтобы переместить её,
            или на другую палету, чтобы поменять их местами.
            <button
              className="btn gray"
              style={{ marginLeft: 8, padding: '5px 9px' }}
              onClick={() => setSelected(null)}
            >Отмена</button>
          </div>
        )}

        <section className="board">
          <div className="board-title">
            <strong>ПЛАН СКЛАДА</strong>
            <span className="muted">{rows} × {cols} · {rows * cols} мест</span>
          </div>

          <div
            className="board-grid"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: rows }, (_, r) =>
              Array.from({ length: cols }, (_, c) => {
                const pallet = getPallet(r, c)

                if (!pallet) {
                  return (
                    <button
                      key={`${r}-${c}`}
                      className="cell"
                      onClick={() => moveToEmpty(r, c)}
                    >
                      <span className="empty-plus">+</span>
                      <span className="empty-label">{r + 1}.{c + 1}</span>
                    </button>
                  )
                }

                const colors = colorsFor(pallet)
                const isSelected = selected === pallet.id
                const isFound = search.trim() && matching(pallet)

                return (
                  <div
                    key={pallet.id}
                    className={`cell ${isSelected ? 'selected' : ''} ${isFound ? 'found' : ''}`}
                    onClick={() => movePallet(pallet)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="stripes">
                      {colors.length ? colors.map((color, i) => (
                        <div key={i} className="stripe" style={{ background: color }} />
                      )) : (
                        <div className="stripe" style={{ background: '#475569' }} />
                      )}
                    </div>
                    <span className="pallet-icon">📦</span>
                    <span className="pallet-name">{pallet.name}</span>
                    <span className="pallet-count">{pallet.products.length} видов</span>
                  </div>
                )
              })
            )}
          </div>

          <div className="legend">
            {categories.map(cat => (
              <div className="legend-item" key={cat.name}>
                <span className="dot" style={{ background: cat.color }} />
                {cat.name}
              </div>
            ))}
          </div>
        </section>

        <section className="details">
          <div className="details-title">
            {search ? `Результаты поиска (${foundPallets.length})` : 'Содержимое склада'}
          </div>

          {foundPallets.length === 0 && (
            <div className="empty-note">Ничего не найдено</div>
          )}

          {foundPallets.map(pallet => (
            <div className="product-card" key={pallet.id}>
              <div className="product-top">
                <div>
                  <strong>{pallet.name}</strong>
                  <div className="product-info">
                    Ряд {pallet.row + 1}, колонка {pallet.col + 1}
                  </div>
                </div>
                <button className="btn gray" onClick={() => setSelected(pallet.id)}>
                  Переместить
                </button>
              </div>

              {pallet.products.length === 0 && (
                <div className="empty-note">Палета пустая</div>
              )}

              {pallet.products.map(product => (
                <div className="product-top" key={product.id} style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', gap: 9, alignItems: 'center', minWidth: 0 }}>
                    <div className="product-color" style={{ background: colorFor(product.category) }} />
                    <div>
                      <div className="product-name">{product.name}</div>
                      <div className="product-info">
                        {product.category} · {product.quantity} шт.
                      </div>
                    </div>
                  </div>
                  <div className="product-actions">
                    <button className="btn gray" onClick={() => editProduct(pallet.id, product)}>✏️</button>
                    <button className="btn red" onClick={() => deleteProduct(pallet.id, product.id)}>🗑</button>
                  </div>
                </div>
              ))}

              <div className="product-actions">
                <button className="btn green" onClick={() => addProduct(pallet.id)}>
                  + Добавить товар
                </button>
                <button className="btn gray" onClick={() => renamePallet(pallet)}>
                  Переименовать
                </button>
                <button className="btn red" onClick={() => deletePallet(pallet.id)}>
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </section>

        <div className="footer">
          WAREHOUSE MANAGER · Данные пока сохраняются только в этом браузере
        </div>
      </main>
    </div>
  )
}

export default App
