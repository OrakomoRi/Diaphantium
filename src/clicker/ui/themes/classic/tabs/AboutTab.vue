<script setup lang="ts">
import { ExternalLink } from '@lucide/vue';
import { useAbout } from '../../../model/about';
import GithubMark from '../../../components/GithubMark.vue';
import TabPane from '../components/TabPane.vue';

const about = useAbout();
</script>

<template>
	<TabPane name="about">
		<h2 class="tab-panel__title">{{ $t('about.header') }}</h2>

		<div class="tab-panel__scroll">
			<div class="card about">
				<div class="about__hero">
					<span class="about__name">{{ about.name }}</span>
					<span class="about__tagline">{{ $t('about.tagline') }}</span>
				</div>

				<div class="divider"></div>

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

			<a class="card repository" :href="about.repository" target="_blank" rel="noopener noreferrer" data-about="repository" v-tooltip="$t('tooltips.repository')">
				<span class="option__icon" aria-hidden="true"><GithubMark /></span>
				<span class="option__text">
					<span class="option__label">{{ $t('about.repository') }}</span>
					<span class="option__hint">{{ $t('about.star') }}</span>
				</span>
				<ExternalLink class="repository__arrow" />
			</a>
		</div>
	</TabPane>
</template>
