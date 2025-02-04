import { ref, computed, h, markRaw } from 'vue'

export function usePagination() {
  const pagination = ref({
    total_pages: 1,
    has_pre: false,
    has_next: false
  })
  const currentPage = ref(1)
  const hasPrev = computed(() => currentPage.value > 1)
  const hasNext = computed(() => currentPage.value < totalPages.value)
  const totalPages = computed(() => Math.max(1, pagination.value.total_pages))

  function updatePagination(newPagination) {
    pagination.value = newPagination
  }

  async function changePage(page, callback) {
    const maxPage = totalPages.value
    const targetPage = Math.min(Math.max(1, page), maxPage)

    if (currentPage.value !== targetPage) {
      currentPage.value = targetPage
      pagination.value.has_pre = targetPage > 1
      pagination.value.has_next = targetPage < maxPage 
      if (callback) await callback(targetPage)
    }
  }

  const PaginationComponent = markRaw({
    name: 'PaginationComponent',
    props: {
      dataLength: { type: Number, required: true },
      onPageChange: { type: Function, required: true }
    },
    setup(props) {
      const handlePageClick = (page) => (e) => {
        e.preventDefault()
        if (page === '上一頁') {
          props.onPageChange(currentPage.value - 1)
        } else if (page === '下一頁') {
          props.onPageChange(currentPage.value + 1)
        } else {
          props.onPageChange(page)
        }
      }

      const createPageItem = (page, isDisabled = false) => {
        const isNavigationButton = page === '上一頁' || page === '下一頁'
        const isActive = !isNavigationButton && page === currentPage.value

        return h('li', {
          class: ['page-item', { active: isActive, disabled: isDisabled }]
        }, [
          h('a', {
            class: 'page-link',
            href: '#',
            onClick: handlePageClick(page)
          }, page)
        ])
      }

      return () => h('nav', {
        'aria-label': 'Page navigation',
        class: 'mt-4'
      }, [
        h('ul', { class: 'pagination justify-content-center' }, [
          h('li', {
            class: ['page-item', { disabled: !hasPrev.value }]
          }, [
            h('a', {
              class: 'page-link',
              href: '#',
              onClick: handlePageClick('上一頁')
            }, '上一頁')
          ]),
          ...Array.from({ length: totalPages.value }, (_, i) =>
            createPageItem(i + 1)
          ),
          h('li', {
            class: ['page-item', { disabled: !hasNext.value }]
          }, [
            h('a', {
              class: 'page-link',
              href: '#',
              onClick: handlePageClick('下一頁')
            }, '下一頁')
          ])
        ])
      ])
    }
  })

  return {
    pagination,
    currentPage,
    hasPrev,
    hasNext,
    totalPages,
    updatePagination,
    changePage,
    PaginationComponent
  }
}
