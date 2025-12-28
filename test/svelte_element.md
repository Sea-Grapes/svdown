<script>
	function handleKeydown(event) {
		alert(`pressed the ${event.key} key`);
	}
</script>

# This is some markdown
isn't this so cool

<svelte:window onkeydown={handleKeydown} />

*Now normally this wouldn't work with two windows but its fine for testing*
<svelte:window
  onkeydown={() => {
    console.log('hi')
  }}
>
  <title>Idk if **bold** would work here probably needs newline</title>
</svelte:window>