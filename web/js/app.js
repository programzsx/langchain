/*
 * langchain · Arco Design Pro Monorepo 包管理后台（React 18 UMD，无构建）
 * 数据：web/data/index.json（由 build-index.js 扫描各包 pyproject.toml 生成）。
 * 模块：概览看板 + 全部包表格 + 按分组浏览。
 */
(function () {
  'use strict';

  var React = window.React;
  var ReactDOM = window.ReactDOM;
  var A = window.arco;
  var I = window.arcoicon;
  var h = React.createElement;
  var st = React.useState;
  var ef = React.useEffect;

  /* ===== 数据加载 ===== */
  function useIndex() {
    var r = st({ loading: true, data: null, error: null });
    ef(function () {
      fetch('data/index.json')
        .then(function (res) {
          if (!res.ok) throw new Error('索引加载失败（HTTP ' + res.status + '）');
          return res.json();
        })
        .then(function (data) { r[1]({ loading: false, data: data, error: null }); })
        .catch(function (e) { r[1]({ loading: false, data: null, error: e }); });
    }, []);
    return r[0];
  }

  /* ===== 概览看板 ===== */
  function Overview(props) {
    var index = props.index;
    var onOpenGroup = props.onOpenGroup;
    var groups = {};
    index.packages.forEach(function (p) {
      groups[p.group] = (groups[p.group] || 0) + 1;
    });
    var groupEntries = Object.keys(groups).map(function (g) {
      return { group: g, count: groups[g] };
    });

    return h('div', null,
      h('div', { className: 'stat-grid' },
        h(A.Card, null, h(A.Statistic, {
          title: '包总数', value: index.total,
          prefix: h(I.IconApps, { style: { fontSize: 22, color: 'var(--brand)', marginRight: 8 } }),
        })),
        h(A.Card, null, h(A.Statistic, {
          title: '分组数量', value: groupEntries.length,
          prefix: h(I.IconFolder, { style: { fontSize: 22, color: 'var(--brand)', marginRight: 8 } }),
        })),
        h(A.Card, null, h(A.Statistic, {
          title: '合作方集成', value: groups['合作方集成'] || 0,
          prefix: h(I.IconShareInternal, { style: { fontSize: 22, color: 'var(--brand)', marginRight: 8 } }),
        })),
        h(A.Card, null, h(A.Statistic, {
          title: '索引生成时间', value: String(index.generatedAt || '').slice(0, 10),
          prefix: h(I.IconClockCircle, { style: { fontSize: 22, color: 'var(--brand)', marginRight: 8 } }),
        }))
      ),
      h(A.Card, { title: '包分组总览' },
        h(A.List, {
          dataSource: groupEntries,
          render: function (item) {
            return h(A.List.Item, {
              key: item.group,
              style: { cursor: 'pointer' },
              onClick: function () { onOpenGroup(item.group); },
            },
              h(A.List.Item.Meta, {
                avatar: h(A.Avatar, { style: { background: 'var(--brand)' } }, String(item.group[0] || '')),
                title: item.group,
                description: item.count + ' 个包',
              }),
              h(A.Tag, { color: 'arcoblue' }, item.count)
            );
          },
        })
      )
    );
  }

  /* ===== 包表格 ===== */
  function PackageTable(props) {
    var packages = props.packages;
    var title = props.title;

    var columns = [
      {
        title: '包名',
        dataIndex: 'name',
        render: function (v) {
          return h('span', { className: 'pkg-name' }, v);
        },
      },
      { title: '版本', dataIndex: 'version', width: 110 },
      { title: '描述', dataIndex: 'description', ellipsis: true },
      { title: '分组', dataIndex: 'group', width: 140 },
      {
        title: '目录',
        dataIndex: 'dir',
        width: 200,
        render: function (v) {
          return h('code', null, v);
        },
      },
    ];

    return h(A.Card, {
      title: title,
      extra: h(A.Tag, { color: 'arcoblue' }, packages.length + ' 个包'),
    },
      h(A.Table, {
        columns: columns,
        data: packages,
        pagination: packages.length > 15 ? { pageSize: 15, showTotal: true } : false,
        noDataElement: '暂无包',
      })
    );
  }

  /* ===== 布局（Arco Pro 模板） ===== */
  function App() {
    var idx = useIndex();
    var active = st('overview');
    var keyword = st('');

    if (idx.loading) {
      return h(A.Spin, { size: 40, style: { display: 'block', margin: '120px auto' } });
    }
    if (idx.error) {
      return h(A.Result, {
        status: 'error',
        title: '索引加载失败',
        subTitle: String(idx.error.message || idx.error),
      });
    }
    var index = idx.data;

    /* 分组列表（保持索引里的出现顺序） */
    var groupList = [];
    index.packages.forEach(function (p) {
      if (groupList.indexOf(p.group) === -1) groupList.push(p.group);
    });

    /* 检索 */
    var searched = [];
    if (keyword[0]) {
      var q = keyword[0].toLowerCase();
      searched = index.packages.filter(function (p) {
        return p.name.toLowerCase().indexOf(q) !== -1
          || (p.description || '').toLowerCase().indexOf(q) !== -1;
      });
    }

    var activeLabel = active[0] === 'overview'
      ? '概览'
      : active[0] === 'all'
        ? '全部包'
        : (groupList.indexOf(active[0]) !== -1 ? active[0] : '');

    return h(A.Layout, { className: 'pro-layout' },
      h(A.Layout.Header, { className: 'pro-header' },
        h('div', { className: 'pro-brand' },
          h('span', { className: 'pro-logo' }),
          h('span', null,
            h('div', { className: 'pro-title' }, 'LangChain Monorepo 包管理'),
            h('div', { className: 'pro-sub' }, 'libs/ 包信息看板')
          )
        ),
        h(A.Input.Search, {
          style: { width: 260 },
          placeholder: '搜索包名或描述…',
          searchButton: true,
          value: keyword[0],
          onChange: keyword[1],
        })
      ),
      h(A.Layout, { className: 'pro-body' },
        h(A.Layout.Sider, { className: 'pro-sider', width: 200, breakpoint: 'lg' },
          h(A.Menu, {
            mode: 'vertical',
            selectedKeys: [active[0]],
            onClickMenuItem: function (key) { active[1](key); },
          },
            h(A.Menu.Item, { key: 'overview' },
              h(I.IconHome, { style: { marginRight: 8 } }), '概览'),
            h(A.Menu.Item, { key: 'all' },
              h(I.IconList, { style: { marginRight: 8 } }), '全部包'),
            groupList.map(function (group) {
              return h(A.Menu.Item, { key: group },
                h(I.IconFolder, { style: { marginRight: 8 } }), group);
            })
          )
        ),
        h(A.Layout.Content, { className: 'pro-content' },
          h(A.Breadcrumb, { className: 'pro-breadcrumb' },
            h(A.Breadcrumb.Item, null, '首页'),
            h(A.Breadcrumb.Item, null, activeLabel)
          ),
          keyword[0]
            ? h(PackageTable, {
                packages: searched,
                title: '搜索结果',
              })
            : (active[0] === 'overview'
                ? h(Overview, {
                    index: index,
                    onOpenGroup: function (group) { active[1](group); },
                  })
                : active[0] === 'all'
                  ? h(PackageTable, { packages: index.packages, title: '全部包' })
                  : h(PackageTable, {
                      packages: index.packages.filter(function (p) { return p.group === active[0]; }),
                      title: active[0],
                    })),
          h(A.Layout.Footer, { className: 'pro-footer' },
            'LangChain Monorepo · Powered by Arco Design')
        )
      )
    );
  }

  document.addEventListener('DOMContentLoaded', function () {
    ReactDOM.createRoot(document.getElementById('root')).render(
      h(A.ConfigProvider, null, h(App))
    );
  });
})();
