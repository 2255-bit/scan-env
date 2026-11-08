<script>
  export let name = 'World';
  const analyticsId = import.meta.env.VITE_GA_ID;
  const buildId = process.env['BUILD_ID'];
</script>

<h1>Hello {name}!</h1>
