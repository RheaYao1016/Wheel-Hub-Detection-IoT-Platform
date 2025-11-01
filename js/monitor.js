(function () {
  if (window.echarts) {
    const trendEl = document.getElementById('monitorTrend');
    const sizeEl = document.getElementById('sizeDonut');
    const modelEl = document.getElementById('modelDonut');

    if (trendEl) {
      const trendChart = echarts.init(trendEl);
      const trendData = Array.from({ length: 30 }, () => Math.round(40 + Math.random() * 60));
      trendChart.setOption({
        grid: { left: 48, right: 24, top: 32, bottom: 36 },
        tooltip: { trigger: 'axis', backgroundColor: 'rgba(5, 23, 45, 0.85)', borderWidth: 0 },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: buildLabels(),
          axisLine: { lineStyle: { color: 'rgba(232, 243, 255, 0.32)' } },
          axisLabel: { color: 'rgba(166, 192, 220, 0.86)' }
        },
        yAxis: {
          type: 'value',
          axisLine: { show: false },
          splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.06)' } },
          axisLabel: { color: 'rgba(166, 192, 220, 0.86)' }
        },
        series: [
          {
            type: 'line',
            smooth: true,
            symbol: 'circle',
            symbolSize: 6,
            animationDuration: 600,
            itemStyle: { color: '#51d3c3' },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(81, 211, 195, 0.45)' },
                { offset: 1, color: 'rgba(81, 211, 195, 0.05)' }
              ])
            },
            data: trendData
          }
        ]
      });
      window.addEventListener('resize', () => trendChart.resize());
    }

    if (sizeEl) {
      const sizeChart = echarts.init(sizeEl);
      sizeChart.setOption(buildDonutOption('尺寸分布', [
        { name: '15寸', value: 12 },
        { name: '16寸', value: 17 },
        { name: '17寸', value: 28 },
        { name: '18寸', value: 20 },
        { name: '19寸', value: 23 }
      ]));
      window.addEventListener('resize', () => sizeChart.resize());
    }

    if (modelEl) {
      const modelChart = echarts.init(modelEl);
      modelChart.setOption(buildDonutOption('型号分布', [
        { name: '型号A', value: 18 },
        { name: '型号B', value: 8 },
        { name: '型号C', value: 22 },
        { name: '型号D', value: 13 },
        { name: '型号E', value: 39 }
      ]));
      window.addEventListener('resize', () => modelChart.resize());
    }
  }

  ['1', '2', '3', '4'].forEach((id) => bindCamera(cameraBtn, cameraVideo));

  function bindCamera(buttonId, videoId) {
    const button = document.getElementById(buttonId);
    const video = document.getElementById(videoId);
    if (!button || !video) return;
    button.addEventListener('click', async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        await video.play();
      } catch (err) {
        alert('无法打开摄像头，请检查浏览器权限设置。');
      }
    });
  }

  function buildDonutOption(title, data) {
    return {
      color: ['#5bbdf7', '#51d3c3', '#9ad0f5', '#ffd166', '#a5bde8'],
      tooltip: { trigger: 'item' },
      legend: {
        orient: 'vertical',
        right: 0,
        top: 'middle',
        textStyle: { color: '#e8f3ff', fontSize: 12 }
      },
      series: [
        {
          name: title,
          type: 'pie',
          radius: ['58%', '78%'],
          center: ['40%', '52%'],
          avoidLabelOverlap: true,
          label: {
            show: true,
            formatter: '{b} {d}%',
            color: '#e8f3ff',
            fontSize: 12
          },
          labelLine: { length: 12, length2: 8 },
          data
        }
      ]
    };
  }

  function buildLabels() {
    const labels = [];
    const now = new Date();
    for (let i = 29; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      labels.push(${d.getMonth() + 1}/);
    }
    return labels;
  }
})();
