# 大文件上传demo
`意在理解大文件上传原理:`
- 文件切片 (blob的slice方法)
- 通过FormData把每个切片带给后台
- 前端限制请求并发 (谷歌浏览器，最大并发为6，多了容易导致浏览器卡死，demo中限制为3)
- 主动停止上传，可以恢复，若所有暂停的上传已经恢复，会发起合并请求(通过nodejs合并流)
