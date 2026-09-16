<script setup lang="ts">
import { ref } from 'vue';
import { ExternalLink } from '@lucide/vue';
import { useAbout } from '../../../model/about';
import GithubMark from '../../../components/GithubMark.vue';
import { useStateLayer } from '../motion';

const about = useAbout();

const link = ref<HTMLElement | null>(null);
const plate = ref<HTMLElement | null>(null);

useStateLayer(link, plate);
</script>

<template>
	<div class="stack">
		<div class="setting about">
			<div class="about__hero">
				<span class="about__name">{{ about.name }}</span>
				<span class="about__tagline">{{ $t('about.tagline') }}</span>
			</div>
			<dl class="about__facts">
				<dt>{{ $t('about.version') }}</dt>
				<dd data-about="version">{{ about.version }}</dd>
				<dt>{{ $t('about.released') }}</dt>
				<dd data-about="released">{{ about.released.value }}</dd>
				<dt>{{ $t('about.author') }}</dt>
				<dd data-about="author">{{ about.author }}</dd>
				<dt>{{ $t('about.license') }}</dt>
				<dd data-about="license">{{ about.license }}</dd>
			</dl>
		</div>
		<a
			ref="link"
			class="setting repository"
			:href="about.repository"
			target="_blank"
			rel="noopener noreferrer"
			data-about="repository"
			v-tooltip="$t('tooltips.repository')"
		>
			<span ref="plate" class="repository__plate" aria-hidden="true"></span>
			<span class="setting__main">
				<span class="repository__icon" aria-hidden="true"><GithubMark /></span>
				<span class="setting__text">
					<span class="setting__title">{{ $t('about.repository') }}</span>
					<span class="setting__desc">{{ $t('about.star') }}</span>
				</span>
				<ExternalLink class="repository__arrow" :size="15" :stroke-width="2.2" />
			</span>
		</a>
	</div>
</template>
