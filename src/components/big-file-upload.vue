<template>
  <div>
    <input type="file" @change="handleFileChange" />
    <el-button @click="handleUpload">上传</el-button>
    <el-table :data="sliceList">
      <el-table-column
        prop="chunkHash"
        label="切片hash"
        align="center"
      ></el-table-column>
      <el-table-column prop="size" label="大小(KB)" align="center" width="120">
      </el-table-column>
      <el-table-column label="进度" align="center">
        <template v-slot="{ row }">
          <el-progress
            :percentage="row.percentage"
            status="success"
          ></el-progress>
          {{ row.percentage }} %
        </template>
      </el-table-column>
      <el-table-column align="center">
        <template v-slot="{ row }">
          <el-button  v-if="row.pause" size="small" @click="() => recover(row)">恢复</el-button>
          <el-button v-else size="small" type="danger" @click="() => pause(row)"
            >暂停</el-button
          >
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script>
const SIZE_LIMIT = 2 * 1024 * 1024;

import axios from "axios";

export default {
  data() {
    return {
      file: null,
      sliceList: [],
      pauses: [],
    };
  },
  methods: {
    pause(row) {
      row.pause = true;
      row.cancel({
        idx: row.idx,
      });
    },
    async recover(row) {
      row.pause = false;
      const { idx } = row;
      const recoverTask = this.pauses.find((t) => t.idx === idx);
      if (recoverTask) {
        console.log(recoverTask.idx)
        await recoverTask.request();
        this.splicePauseTask(idx);
        await this.mergeFileRequest();
      }
    },
    splicePauseTask(idx) {
        const index = this.pauses.findIndex(t => t.idx === idx);
        this.pauses.splice(index, 1); // 成功后移除这个暂停的任务
    },
    handleFileChange(e) {
      const [file] = e.target.files;
      if (!file) return;
      this.file = file;
      this.sliceList.length = 0;
      this.genSlicesList();
    },
    genSlicesList() {
      const file = this.file;
      const chunkFilename = file.name;
      let cur = 0;
      let idx = 0;
      while (cur < file.size) {
        const sliceFile = file.slice(cur, (cur += SIZE_LIMIT));
        const chunkHash = idx + "_" + chunkFilename;
        const formData = new FormData();
        formData.append("chunk", sliceFile);
        formData.append("chunkFilename", chunkFilename);
        formData.append("chunkHash", chunkHash);
        formData.append("size", SIZE_LIMIT);
        this.sliceList.push({
          formData,
          size: Math.round(sliceFile.size / 1024),
          chunkHash,
          percentage: 0,
          idx,
          pause: false, // true现实恢复按钮，false显示暂停
          cancel: () => {},
        });
        idx++;
      }
    },
    loopRequest(promises, max = 3) {
      const taskPool = [];
      const loopFn = async (tasks) => {
        if (tasks.length === 0) return; // 中断条件
        const shiftTask = tasks.shift();
        try {
          await shiftTask.request(); // 任务完成则接着执行下一个
        } catch (error) {
          this.pauses.push(shiftTask); // 收集请求错误或者手动暂停的任务
        }
        return loopFn(tasks);
      };
      while (max--) {
        taskPool.push(loopFn(promises));
      }
      return Promise.all(taskPool);
    },
    uploadChunks() {
      const requestList = this.sliceList.map((slice) => {
        return {
          idx: slice.idx,
          request: () =>
            axios({
              method: "post",
              url: "http://localhost:3000/upload",
              data: slice.formData,
              onUploadProgress: (progressEvent) => {
                slice.percentage =
                  ((progressEvent.loaded / progressEvent.total) * 100) | 0;
              },
              cancelToken: new axios.CancelToken((source) => {
                slice.cancel = source;
              }),
            }),
        };
      });
      return requestList;
    },
    async handleUpload() {
      const promises = this.uploadChunks();
      await this.loopRequest(promises); // 切片全部上传后，合并文件请求
      this.mergeFileRequest();
    },
    async mergeFileRequest() {
      if (this.pauses.length > 0) return;
      await axios({
        method: "post",
        url: "http://localhost:3000/merge",
        data: {
          size: SIZE_LIMIT,
          filename: this.file.name,
        },
      });
      this.$message({
        message: '上传成功～',
        type: 'success'
      })
    },
  },
};
</script>
