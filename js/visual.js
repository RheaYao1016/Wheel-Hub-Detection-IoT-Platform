(function () {
  const qualityChart = document.getElementById('qualityDonut');
  const volumeChart = document.getElementById('volumeTrend');

  if (qualityChart && volumeChart && window.echarts) {
    const donut = echarts.init(qualityChart);
    const donutData = [
      { name: '15寸', value: 23 },
      { name: '16寸', value: 17 },
      { name: '17寸', value: 20 },
      { name: '18寸', value: 28 },
      { name: '19寸', value: 12 }
    ];
    donut.setOption({
      color: ['#5bbdf7', '#51d3c3', '#9ad0f5', '#ffd166', '#a5bde8'],
      legend: {
        orient: 'vertical',
        right: 0,
        top: 'middle',
        textStyle: { color: '#e8f3ff', fontSize: 12 }
      },
      series: [
        {
          type: 'pie',
          radius: ['60%', '78%'],
          center: ['40%', '52%'],
          avoidLabelOverlap: true,
          label: {
            show: true,
            formatter: '{b} {d}%',
            color: '#e8f3ff',
            fontSize: 12
          },
          labelLine: { length: 12, length2: 8 },
          data: donutData
        }
      ],
      graphic: [
        {
          type: 'text',
          left: '40%',
          top: '52%',
          style: {
            text: '92%\n合格率',
            fill: '#ffffff',
            textAlign: 'center',
            fontSize: 18,
            fontWeight: '700'
          }
        }
      ]
    });

    const line = echarts.init(volumeChart);
    const trendData = Array.from({ length: 30 }, () => Math.round(220 + Math.random() * 160));
    line.setOption({
      grid: { left: 50, right: 20, top: 35, bottom: 40 },
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(5, 23, 45, 0.85)', borderWidth: 0 },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: buildLabels(),
        axisLine: { lineStyle: { color: 'rgba(232, 243, 255, 0.3)' } },
        axisLabel: { color: 'rgba(166, 192, 220, 0.9)' }
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.06)' } },
        axisLabel: { color: 'rgba(166, 192, 220, 0.9)' }
      },
      series: [
        {
          type: 'line',
          smooth: true,
          symbolSize: 6,
          animationDuration: 600,
          itemStyle: { color: '#5bbdf7' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(91, 189, 247, 0.45)' },
              { offset: 1, color: 'rgba(91, 189, 247, 0.05)' }
            ])
          },
          data: trendData
        }
      ]
    });

    window.addEventListener('resize', function () {
      donut.resize();
      line.resize();
    });
  }

  const projectListEl = document.getElementById('projectList');
  const logListEl = document.getElementById('logList');

  fetch('data.json')
    .then((res) => res.json())
    .then((data) => {
      renderProjectList(data.slice(0, 12));
      renderLogList(data.slice(0, 8));
    })
    .catch(() => {
      renderProjectList([]);
      renderLogList([]);
    });

  function renderProjectList(records) {
    if (!projectListEl) return;
    if (!records.length) {
      projectListEl.innerHTML = '<div class=\"empty-item\">暂无实时项目数据</div>';
      return;
    }
    const html = records
      .map((item, index) => {
        const status = index % 7 === 0 ? '复检' : index % 5 === 0 ? '预警' : '合格';
        const dot = status === '合格' ? 'success' : status === '复检' ? 'warn' : 'error';
        return 
          <div class=\"list-item\">
            <span></span>
            <span>mm</span>
            <span>Φ</span>
            <span class=\"status\"><span class=\"status-dot \"></span></span>
          </div>
        ;
      })
      .join('');
    projectListEl.innerHTML = html;
  }

  function renderLogList(records) {
    if (!logListEl) return;
    if (!records.length) {
      logListEl.innerHTML = '<div class=\"empty-item\">暂无检测日志</div>';
      return;
    }
    const now = new Date();
    const html = records
      .map((item, index) => {
        const time = new Date(now.getTime() - index * 18 * 60000);
        const stamp = ${time.getHours().toString().padStart(2, '0')}:;
        const status = index % 4 === 0 ? '复检' : '放行';
        const message = status === '放行' ? '检验通过，已同步至仓储系统。' : '尺寸偏差临界，安排复检确认。';
        return 
          <div class=\"log-entry\">
            <div class=\"log-header\">
              <strong></strong>
              <span></span>
              <span class=\"log-status\"></span>
            </div>
            <div class=\"log-message\"></div>
            <div class=\"log-meta\">
              <span>轮毂直径 mm</span>
              <span>中心孔 Φ</span>
              <span>PCD mm</span>
            </div>
          </div>
        ;
      })
      .join('');
    logListEl.innerHTML = html;
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
