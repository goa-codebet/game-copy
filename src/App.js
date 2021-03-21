import { useEffect, useState } from 'react';
import { createClient } from 'contentful-management';

import './CopyForm.css';
import './Header.css';

const Header = ({ user }) => (
  <div className="Header">
    <img alt="Avatar" src={user?.avatarUrl} />
    <strong>{user?.firstName}</strong>
  </div>
)

const Loader = () => <div>🕺 Loading...</div>

const SourceSelector = ({ spaces, onChange }) => {
  const [ space, setSpace ] = useState(null)
  const [ environment, setEnvironment ] = useState(null)
  const [ environments, setEnvironments ] = useState(null)
  const [ games, setGames ] = useState(null)
  const [ isEnvironmentsLoading, setIsEnvironmentsLoading ] = useState(null)

  const _onChange = (e, type) => {
    if (type === 'space')
      setSpace(spaces?.items?.find(i => i.sys.id === e.target.value));
    else if (type === 'environment')
      setEnvironment(environments?.items?.find(i => i.sys.id === e.target.value));
    else if (type === 'games')
      setGames(e.target.value.split(',').filter((v,i,s) => v && s.indexOf(v) === i));
  }

  // Call onChange whenever something changes
  useEffect(() => {
    onChange?.({
      space,
      environment,
      games,
    })
  }, [space, environment, games])

  // Fetch new environments whenever we change source space
  useEffect(() => {
    const fetchEnvironments = async () => {
      if (space) {
        setEnvironments(null);
        setIsEnvironmentsLoading(true);
        const envs = await space.getEnvironments();
        setEnvironments(envs)
        setIsEnvironmentsLoading(false);
      }
    };

    fetchEnvironments();
  }, [space])

  return (
    <div>
      <select onChange={e => _onChange(e, 'space')}>
        <option>Select source space</option>
        { spaces?.items?.map(item => <option key={item.sys.id} value={item.sys.id}>{ item.name }</option>) }
      </select>

      <select onChange={e => _onChange(e, 'environment')} disabled={isEnvironmentsLoading || !space}>
        { !space && <option>Select space</option> }
        { space && isEnvironmentsLoading && <option>Loading...</option> }
        { space && !isEnvironmentsLoading && <option>Select source environment</option> }
        { space && !isEnvironmentsLoading && environments?.items?.map(item => <option key={item.sys.id} value={item.sys.id}>{ item.name }</option>) }
      </select>

      <input type="text" placeholder="backendId ex. (984,982)"  onChange={e => _onChange(e, 'games')} />
    </div>
  );
}

const TargetSelector = ({ spaces, source, onChange }) => {
  const [ targets, setTargets ] = useState(null);

  const _onChangeRow = data => {
    const _targets = spaces?.items?.map(s => {
      if (s?.sys.id === data.space?.sys.id) {
        return data;
      }

      let target = null
      if (target = targets && targets.find(t => s?.sys.id === t.space.sys.id))
        return target;

      return {
        enabled: false,
        space: s,
        environment: null,
      }
    }).filter(t => t.enabled)

    setTargets(_targets)
  }

  // Call onChange whenever something changes
  useEffect(() => {
    onChange(targets)
  }, [targets])

  return (
    <div className="TargetSelector">
      <table>
        <thead>
          <tr className="CopyFormRow CopyFormRow--header">
            <th>Space</th>
            <th>Environment</th>
            <th>Categories</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          { spaces?.items?.map(space => (
            <CopyFormRow 
              key={space.sys.id} 
              space={space} 
              source={source}
              onChange={_onChangeRow} 
              enabled={targets?.[space.sys.id]?.enabled} />
          )) }
        </tbody>
      </table>
    </div>
  )
}

const CopyFormRow = ({ space, source, status = null, onChange }) => {
  const [ enabled, setEnabled ] = useState(false)
  const [ environment, setEnvironment ] = useState(null)
  const [ environments, setEnvironments ] = useState(null)
  const [ categories, setCategories ] = useState({})

  const _onChange = (e, type) => {
    if (type === 'enabled')
      setEnabled(e.target.checked);
    else if (type === 'environment')
      setEnvironment(environments?.items?.find(i => i.sys.id === e.target.value));
    else if (type === 'categories')
      setCategories({
        ...categories,
        [e.target.name]: e.target.value.split(',')
      })
  }

  // Fetch new environments whenever we enable this space
  useEffect(() => {
    const fetchEnvironments = async () => {
      if (enabled && !environments) {
        setEnvironments(null);
        const envs = await space.getEnvironments();
        setEnvironments(envs)
      }
    };

    fetchEnvironments();
  }, [enabled])

  // Call onChange whenever something changes
  useEffect(() => {
    onChange({
      enabled,
      environment,
      categories,
      space,
    })
  }, [enabled, environment, categories])

  useEffect(() => {
    const fetchEnvironments = async () => {
      if (enabled && !environments) {
        setEnvironments(null);
        const envs = await space.getEnvironments();
        setEnvironments(envs)
      }
    };

    fetchEnvironments();
  }, [enabled])

  return (
    <tr className={source.space?.sys.id === space?.sys.id ? 'CopyFormRow CopyFormRow--source' : 'CopyFormRow'}>
      <td>
        <label>
          <input type="checkbox" onChange={e => _onChange(e, 'enabled')} />
          <strong>{space.name}</strong>
        </label>
      </td>
      
      <td>
        { enabled && !environments && <select><option>Loading...</option></select> }
        { enabled && environments && <select onChange={e => _onChange(e, 'environment')}><option>Select environment</option>{ environments?.items?.map(env => <option key={env.sys.id} value={env.sys.id}>{env.name}</option>) }</select> }
      </td>

      <td>
        { enabled && source?.games?.map(g => (<div key={`${space.sys.id}game${g}`}>{g}:<input name={g} onChange={e => _onChange(e, 'categories')} /></div>)) }
      </td>
      <td>{ status }</td>
    </tr>
  )
}

const createReference = async (targetEnv, sourceEnv, id, type, targetDefaultLocale, sourceDefaultLocale, target, source) => {
  if (type === 'Asset') {
    let asset = await targetEnv.getAsset(id).catch(() => null);
    if (!asset) {
      const sourceAsset = await sourceEnv.getAsset(id).catch(() => null);
      if (!sourceAsset)
        return null;

      asset = await targetEnv.createAsset({
        fields: {
          title: sourceAsset.fields.title?.[sourceDefaultLocale] && {
            [targetDefaultLocale]: sourceAsset.fields.title?.[sourceDefaultLocale]
          },
          description: sourceAsset.fields.description?.[sourceDefaultLocale] && {
            [targetDefaultLocale]: sourceAsset.fields.description?.[sourceDefaultLocale]
          },
          file: {
            [targetDefaultLocale]: {
              contentType: sourceAsset.fields.file?.[sourceDefaultLocale].contentType,
              fileName: sourceAsset.fields.file?.[sourceDefaultLocale].fileName,
              upload: 'https:'+sourceAsset.fields.file?.[sourceDefaultLocale].url,
            }
          }
        }
      });
      asset = await asset.processForAllLocales();
      asset = await asset.publish();
    }

    return {
      sys: {
        id: asset.sys.id,
        linkType: 'Asset',
        type: 'Link'
      }
    };
  }

  if (type === 'Entry') {
    let entry = await targetEnv.getEntry(id).catch(() => null);
    if (!entry) {
      const sourceEntry = await sourceEnv.getEntry(id).catch(() => null);
      if (!sourceEntry)
        return null;

      const targetContentType = await targetEnv.getContentType(sourceEntry.sys?.contentType?.sys?.id).then(res => res.fields.map(f => f.id));
      if (!targetContentType)
        return null;


      const fields = {};
      for (const field of targetContentType) {
        if (sourceEntry.fields[field]?.[sourceDefaultLocale]) {
          if (!fields[field])
            fields[field] = {}

          fields[field][targetDefaultLocale] = await copyField(sourceEntry.fields[field]?.[sourceDefaultLocale], field, target, source, targetDefaultLocale, sourceDefaultLocale);
        }
      }

      entry = await targetEnv.createEntry(sourceEntry.sys?.contentType?.sys?.id, {
        fields
      });
      entry = await entry.publish();

      return {
        sys: {
          id: entry.sys.id,
          linkType: 'Entry',
          type: 'Link'
        }
      };

    }
  }
  return null;
}

const copyField = async (sourceField, field, target, source, targetDefaultLocale, sourceDefaultLocale) => {
  // Deal with references (Segments have the same ids x spaces so it's ok to reference them.)
  if (sourceField?.sys?.type === 'Link' && field !== "segment")
    return await createReference(target.environment, source.environment, sourceField?.sys?.id, sourceField?.sys?.linkType, targetDefaultLocale, sourceDefaultLocale, target, source);
  // Regular fields
  else if (Array.isArray(sourceField)) {
    const items = [];
    for (const sourceItem of sourceField) {
      const item = await copyField(sourceItem, field, target, source, targetDefaultLocale, sourceDefaultLocale)
      items.push(item);
    }
    return items;
  }

  return sourceField
}

const CopyForm = ({ spaces }) => {
  // Source space and env
  const [ source, setSource ] = useState(null);

  // Targets to copy to 
  const [ targets, setTargets ] = useState([]);

  // Progress
  const [ isLoading, setIsLoading ] = useState(false);
  const [ progress, setProgress ] = useState(0);
  const [ eta, setEta ] = useState(0);

  const startCopy = async e => {
    e.preventDefault();
    setEta(0);
    setProgress(0);
    setIsLoading(true);
    const sourceDefaultLocale = await source.environment.getLocales().then(res => res?.items?.find(l => l.default)?.code);
    const sourceContentType = await source.environment.getContentType('game').then(res => res.fields.map(f => f.id))
    const sourceGames = await source.environment.getEntries({
      content_type: 'game',
      'fields.backendId[in]': source.games.join(',')
    })

    // All games need to exist in source before we continue
    if (source.games.length != sourceGames?.items?.length) {
      alert(`Not all games were found in source. Please make sure all games exists in "${source.space.name}(${source.environment.name})". Found: ${sourceGames?.items?.map(g => g.fields.backendId[Object.keys(g.fields.backendId)[0]])}`)
      return;
    }

    let runs = [];
    for(const target of targets) {
      const targetDefaultLocale = await target.environment.getLocales().then(res => res?.items?.find(l => l.default)?.code);
      const targetContentType = await target.environment.getContentType('game').then(res => res.fields.map(f => f.id))
      
      // Make sure we have the same content type
      // TODO: Change this to use the targetContentType fields in createEntry instead and allow a diff?
      // const diff = sourceContentType.filter(f => !targetContentType.includes(f));
      // if (diff.length > 0) {
      //   alert(`Content types missmatch. Make sure the same fields exists in both "${source.space.name}(${source.environment.name})" and "${target.space.name}(${target.environment.name})". Diff: ${diff.join(', ')}`)
      //   setIsLoading(false);
      //   return;
      // }

      const targetGames = await target.environment.getEntries({
        content_type: 'game',
        'fields.backendId[in]': source.games.join(',')
      })

      // Abort if any game already exists.
      if (targetGames?.items?.length > 0) {
        alert(`One or more games already exists on "${target.space.name}(${target.environment.name})". Found: ${targetGames?.items?.map(g => g.fields.backendId[Object.keys(g.fields.backendId)[0]])}`)
        setIsLoading(false);
        return;
      }

      for (const sourceGame of sourceGames?.items) {
        const start = Date.now();
        const fields = {}
        for (const field of targetContentType) {
          if (sourceGame.fields[field]?.[sourceDefaultLocale]) {

            if (!fields[field])
              fields[field] = {}

            if (field === 'categories') {
              const backendId = sourceGame.fields['backendId']?.[sourceDefaultLocale];
              const cats = await target.environment.getEntries({
                content_type: 'gameCategory'
              });
              // TODO: Create missing cats?
              const filterdcatsrefs = cats?.items
                ?.filter(i => 
                  target?.categories?.[backendId]
                    ?.map(s => s.toLowerCase())
                    .includes(i?.fields?.name?.[targetDefaultLocale]?.toLowerCase())
                )
                .map(cat => ({
                  sys: {
                    id: cat.sys.id,
                    linkType: 'Entry',
                    type: 'Link'
                  }
                }))
              fields[field] = {
                [targetDefaultLocale]: filterdcatsrefs
              }
              continue;
            }
            else
              fields[field][targetDefaultLocale] = await copyField(sourceGame.fields[field]?.[sourceDefaultLocale], field, target, source, targetDefaultLocale, sourceDefaultLocale);
          }
        }

        let entry = await target.environment.createEntry('game', {
          fields
        })
        entry = await entry.publish().catch(() => null)
        runs.push(Date.now()-start);
        setProgress(runs.length/(sourceGames?.items?.length*targets.length));
        setEta((runs.reduce((a,b) => a+b,0)/runs.length)*progress);
      }
    }
    setIsLoading(false)
  }

  return (
    <div className="CopyForm">
      <fieldset>
        <legend>Source</legend>
        <SourceSelector spaces={spaces} onChange={e => setSource(e)}/>
      </fieldset>

      <fieldset>
        <legend>Targets</legend>
        <TargetSelector spaces={spaces} source={source} onChange={e => setTargets(e)} />
      </fieldset>

      <fieldset>
        <legend>Confirmation</legend>

        <div>From <code>{source?.space?.name}({source?.environment?.name})</code></div>
        <div>copy games</div>
        {targets?.map(target => {
          return source?.games?.map(game => {
            const spaceName = `${target?.space?.name} (${target?.environment?.name})`
            const categories = target?.categories?.[game]?.join(', ')
            return <div><code>{game}</code> to <code>{spaceName}</code> {categories && <>append categories <code>{categories}</code></>}</div>
          })
        })}
        <br />
        { !isLoading && <button onClick={e => startCopy(e)}>Confirm &amp; copy</button>}
        { isLoading && <Loader /> }
        { isLoading && <div>ETA: {eta/1000 > 60 ? (eta/1000/60)+'min' : (eta/1000)+'sec'}</div> }
        { isLoading && <div>Progress: {progress*100}%</div> }
      </fieldset>
    </div>
  )
}

const App = ({ token }) => {
  const [ isLoading, setIsLoading ] = useState(true);
  const [ data, setData ] = useState({});

  const client = createClient({
    accessToken: token
  });
  
  useEffect(async () => {
    const [spaces, user] = await Promise.all([
      client.getSpaces(),
      client.getCurrentUser(),
    ]);

    setIsLoading(false);
    setData({ spaces, user });
  }, []);

  return (
    <div className="App">
      { isLoading && <Loader />}
      { !isLoading && <Header user={data.user} />}
      { !isLoading && <CopyForm spaces={data.spaces} />}
    </div>
  )
}

export default App;
