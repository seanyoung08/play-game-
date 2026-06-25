# 街角小店

一个温馨治愈为外壳、商业策略为骨架的单店模拟养成经营游戏。

## 启动

安装依赖：

```powershell
cd E:\javaIDEA\untitled11\src
npm.cmd install
```

启动前端：

```powershell
npm.cmd run dev
```

本机访问：

```text
http://127.0.0.1:5173
```

同一个 Wi-Fi 下，手机访问电脑的 IPv4 地址：

```text
http://你的电脑IP:5173
```

账号、存档、供应商库存都会保存在当前浏览器或 App WebView 的本地存储中，不需要启动数据库服务。

## 让外网用户访问

前端已配置为监听所有网卡，并允许 localtunnel/ngrok 这类临时公网域名访问。外网访问时只需要暴露前端端口 `5173`。

localtunnel：

```powershell
npx localtunnel --port 5173
```

ngrok：

```powershell
ngrok http 5173
```

然后把生成的公网地址发给别人即可。运行期间需要保持前端和隧道窗口不要关闭：

- `npm.cmd run dev`
- `localtunnel` 或 `ngrok`

注意：这是开发环境的临时分享方式。当前版本使用本地存储，不适合长期公开运营或多设备同步。

## 打包成 Android App

项目已接入 Capacitor，可以把当前 React 游戏包装成 Android App。

第一次准备：

```powershell
cd E:\javaIDEA\untitled11\src
npm.cmd install
```

同步网页构建产物到 Android 工程：

```powershell
npm.cmd run mobile:sync
```

打开 Android Studio：

```powershell
npm.cmd run mobile:open
```

在 Android Studio 中可以连接手机运行，或使用 Build 菜单生成 APK。

如果不打开 Android Studio，也可以直接构建 debug APK：

```powershell
npm.cmd run mobile:apk
```

生成位置：

```text
E:\javaIDEA\untitled11\src\android\app\build\outputs\apk\debug\app-debug.apk
```

构建 APK 需要 Java 11 或更高版本。当前 Android Gradle 插件推荐使用 JDK 17。

如果构建时报 `This build uses a Java 8 JVM`，先安装 JDK 17，然后设置：

```powershell
setx JAVA_HOME "C:\Program Files\Java\jdk-17"
setx PATH "%JAVA_HOME%\bin;%PATH%"
```

重开 PowerShell 后确认：

```powershell
java -version
```

确认显示 17 或更高版本后，再运行：

```powershell
npm.cmd run mobile:apk
```

手机 App 版本说明：

- 手机端会复用当前游戏界面和经营规则。
- 手机端账号和存档保存在 App 的 WebView 本地存储中。
- 当前版本不会同步不同设备上的存档。
- 要实现多设备共享账号和存档，需要重新接入后端服务。

## 开发命令

```powershell
npm.cmd test -- --run
npm.cmd run check
npm.cmd run build
npm.cmd run mobile:sync
```
