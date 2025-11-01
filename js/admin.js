(function () {
  if (!window.echarts) return;

  const lineEl = document.getElementById('adminLine');
  const donutEl = document.getElementById('adminDonut');
  const barEl = document.getElementById('adminBar');

  if (lineEl) {
    const lineChart = echarts.init(lineEl);
    const lineData = Array.from({ length: 30 }, () => Math.round(260 + Math.random() * 140));
    lineChart.setOption({
      grid: { left: 50, right: 24, top: 32, bottom: 36 },
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(5, 23, 45, 0.85)', borderWidth: 0 },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: buildLabels(),
        axisLine: { lineStyle: { color: 'rgba(232, 243, 255, 0.3)' } },
        axisLabel: { color: 'rgba(166, 192, 220, 0.86)' }
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.06)' } },
        axisLabel: { color: 'rgba(166, 192, 220, 0.86)' }
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
              { offset: 0, color: 'rgba(91, 189, 247, 0.42)' },
              { offset: 1, color: 'rgba(91, 189, 247, 0.05)' }
            ])
          },
          data: lineData
        }
      ]
    });
    window.addEventListener('resize', () => lineChart.resize());
  }

  if (donutEl) {
    const donutChart = echarts.init(donutEl);
    donutChart.setOption({
      color: ['#51d3c3', '#ff6b81'],
      legend: {
        orient: 'vertical',
        right: 0,
        top: 'middle',
        textStyle: { color: '#e8f3ff', fontSize: 12 }
      },
      series: [
        {
          name: '合格率',
          type: 'pie',
          radius: ['58%', '78%'],
          center: ['40%', '52%'],
          label: { show: true, formatter: '{b} {d}%', color: '#e8f3ff' },
          data: [
            { name: '合格', value: 88 },
            { name: '不合格', value: 12 }
          ]
        }
      ],
      graphic: [
        {
          type: 'text',
          left: '40%',
          top: '52%',
          style: {
            text: '88%\n合格率',
            fill: '#ffffff',
            textAlign: 'center',
            fontSize: 18,
            fontWeight: '700'
          }
        }
      ]
    });
    window.addEventListener('resize', () => donutChart.resize());
  }

  if (barEl) {
    const barChart = echarts.init(barEl);
    const categories = ['17寸', '18寸', '19寸', '20寸', '21寸'];
    const values = [320, 280, 240, 190, 160];
    barChart.setOption({
      grid: { left: 60, right: 20, top: 20, bottom: 30 },
      xAxis: {
        type: 'value',
        splitLine: { show: false },
        axisLabel: { color: 'rgba(166, 192, 220, 0.86)' }
      },
      yAxis: {
        type: 'category',
        data: categories,
        axisLabel: { color: '#e8f3ff' }
      },
      series: [
        {
          type: 'bar',
          data: values,
          barWidth: 16,
          itemStyle: {
            borderRadius: [0, 12, 12, 0],
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: '#5bbdf7' },
              { offset: 1, color: '#4f82f4' }
            ])
          }
        }
      ]
    });
    window.addEventListener('resize', () => barChart.resize());
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
