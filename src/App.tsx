import React from 'react';
import { Tabs } from 'antd';
import MainTab from './MainTab';
// import DocumentationTab from './DocumentationTab';

const App = () => {
  const items = [
    {
      key: 'main',
      label: 'Main',
      children: <MainTab />,
    },
    // { key: 'documentation', label: 'Documentation', children: <DocumentationTab /> }, // commented out as may be needed later
  ];

  return <Tabs items={items} />;
};

export default App;
