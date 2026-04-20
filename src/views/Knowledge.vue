<script setup>
import PageHead from '@/components/PageHead.vue';
import TableSearch from '@/components/TableSearch.vue';
import { ref, onMounted, reactive, nextTick } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { categoryTree, articlePage, getArticleDetail, changeArticleStatus, deleteArticle } from '@/api/admin';
import { Timer } from '@element-plus/icons-vue';
import ArticleDialog from '@/components/ArticleDialog.vue';

const formItem = [{
    comp: 'input', prop: 'title', label: '文章标题', placeholder: '请输入文字标题'
},
{
    comp: 'select', prop: 'category', label: '分类', placeholder: '请选择分类'
},
{
    comp: 'select', prop: 'status', label: '状态', placeholder: '请选择状态', options: [
        { label: '草稿', value: '0' },
        { label: '已发布', value: '1' },
        { label: '已下线', value: '2' },
    ]
}
]

// 分类映射
const categoryMap = reactive({})
// 分类列表
const categories = ref([])
// 列表数据
const tableData = ref([])
// 新增和编辑
const dialogVisible = ref(false)

onMounted(async () => {
    const data = await categoryTree()
    categories.value = (Array.isArray(data) ? data : []).map((item) => {
        categoryMap[item.id] = item.categoryName
        return {
            label: item.categoryName,
            value: item.id,
        }
    })
    formItem[1].options = categories.value
    // 获取列表
    handleSearch()
})

// 分页参数
const pagination = reactive({
    currentPage: 1,
    size: 10,
    total: 0,
})
const handleSearch = async (formData) => {
    console.log(formData, '查询参数')
    const params = {
        ...pagination,
        ...formData
    }
    const { records, total } = await articlePage(params)
    console.log(articlePage(params));

    tableData.value = records
    pagination.total = total
}


const handleChange = () => {
    handleSearch()
}

const handleSuccess = () => {
    dialogVisible.value = false
    // 刷新列表
    handleSearch()
}

/** 当前编辑的文章详情；传给 ArticleDialog 的 article。新增时为 null，编辑时为接口返回对象（需带 id 供 isEdit） */
const currentArticle = ref(null)
const handleEdit = (row) => {
    if (!row.id) {
        // 新增
        currentArticle.value = null
        dialogVisible.value = true
    } else {
        // 编辑
        getArticleDetail(row.id).then(res => {
            console.log(res, '编辑详情');
            currentArticle.value = res
            dialogVisible.value = true
        })
    }

}

// 发布
const handlePublish = (row) => {
    ElMessageBox.confirm(`确定发布文章 ${row.title}吗`, '确认', {
        confirmButtonText: '确认发布',
        cancelButtonText: '取消',
        type: 'info',
    }).then(() => {
        changeArticleStatus(row.id, { status: 1 }).then(() => {
            ElMessage.success('发布成功')
            handleSearch()
        })
    })
}
//下线
const handleUnpublish = (row) => {
    ElMessageBox.confirm(`确定下线文章 ${row.title}吗`, '确认', {
        confirmButtonText: '确认下线',
        cancelButtonText: '取消',
        type: 'warning',
    }).then(() => {
        changeArticleStatus(row.id, { status: 2 }).then(() => {
            ElMessage.success('下线成功')
            handleSearch()
        })
    })
}
// 删除
const handleDelete = (row) => {
    ElMessageBox.confirm(`确定删除文章 ${row.title}吗`, '确认', {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'danger',
    }).then(() => {
        deleteArticle(row.id).then(() => {
            ElMessage.success('删除成功')
            handleSearch()
        })

    })
}

</script>

<template>
    <div>
        <PageHead title="知识文章">
            <template #buttons>
                <el-button type="primary" @click="handleEdit({})">新增</el-button>
            </template>
        </PageHead>
        <TableSearch :formItem="formItem" @search="handleSearch" />

        <el-table :data="tableData" style="width: 100%;margin-top: 25px;">
            <el-table-column prop="title" label="文章标题" width="300" fixed="left">
                <template #default="scope">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <el-icon>
                            <Timer />
                        </el-icon>
                        <span>{{ scope.row.title }}</span>
                    </div>
                </template>
            </el-table-column>

            <el-table-column prop="categoryId" label="分类" width="200">
                <template #default="scope">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <el-icon>
                            <Timer />
                        </el-icon>
                        <span>{{ categoryMap[scope.row.categoryId] }}</span>
                    </div>
                </template>
            </el-table-column>

            <el-table-column prop="authorName" label="作者" width="150" />
            <el-table-column prop="readCount" label="阅读量" width="150" />
            <el-table-column prop="updatedAt" label="发布时间" width="150" />

            <el-table-column label="操作" width="240" fixed="right" align="left" header-align="left"
                label-class-name="knowledge-op-header">
                <template #default="scope">
                    <el-button text type="primary" @click="handleEdit(scope.row)">编辑</el-button>
                    <el-button @click="handlePublish(scope.row)" v-if="scope.row.status === 0 || scope.row.status === 2"
                        text type="success">发布</el-button>
                    <el-button @click="handleUnpublish(scope.row)" v-if="scope.row.status === 1" text
                        type="warning">下线</el-button>
                    <el-button @click="handleDelete(scope.row)" text type="danger">删除</el-button>
                </template>
            </el-table-column>
        </el-table>
        <el-pagination style="margin-top: 25px;" v-model:current-page="pagination.currentPage"
            :page-size="pagination.size" :total="pagination.total" layout="total, prev, pager, next, jumper"
            @change="handleChange" />

        <ArticleDialog v-model:modelValue="dialogVisible" :categories="categories" :article="currentArticle"
            @success="handleSuccess" />
    </div>
</template>


<style lang="scss" scoped>
/* 仅移动表头：与 text 按钮「编辑」默认左内边距对齐，不改按钮间距 */
:deep(.el-table__header th.knowledge-op-header .cell) {
    padding-left: 27px;
}
</style>
