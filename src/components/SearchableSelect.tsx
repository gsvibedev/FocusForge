import React from 'react';
import { Autocomplete, TextField, Chip, Box, Typography } from '@mui/material';

interface Option {
	label: string;
	value: string;
	color?: string;
	description?: string;
}

interface SearchableSelectProps {
	options: Option[];
	value?: string | string[];
	multiple?: boolean;
	placeholder?: string;
	label?: string;
	onChange: (value: string | string[] | null) => void;
	freeSolo?: boolean;
	loading?: boolean;
}

export default function SearchableSelect({
	options,
	value,
	multiple = false,
	placeholder,
	label,
	onChange,
	freeSolo = false,
	loading = false
}: SearchableSelectProps): JSX.Element {
	return (
		<Autocomplete
			multiple={multiple}
			options={options}
			getOptionLabel={(option) => typeof option === 'string' ? option : option.label}
			value={multiple ? (value as string[]) || [] : value || null}
			onChange={(_, newValue) => {
				if (multiple) {
					const values = (newValue as Option[]).map(opt => typeof opt === 'string' ? opt : opt.value);
					onChange(values);
				} else {
					const val = newValue as Option | string | null;
					onChange(val ? (typeof val === 'string' ? val : val.value) : null);
				}
			}}
			freeSolo={freeSolo}
			loading={loading}
			renderOption={(props, option) => (
				<Box component="li" {...props}>
					<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
						{option.color && (
							<Box
								sx={{
									width: 12,
									height: 12,
									borderRadius: '50%',
									backgroundColor: option.color,
									flexShrink: 0
								}}
							/>
						)}
						<Box sx={{ flex: 1 }}>
							<Typography variant="body2" fontWeight={500}>
								{option.label}
							</Typography>
							{option.description && (
								<Typography variant="caption" color="text.secondary">
									{option.description}
								</Typography>
							)}
						</Box>
					</Box>
				</Box>
			)}
			renderTags={multiple ? (value, getTagProps) =>
				value.map((option, index) => {
					const opt = options.find(o => o.value === option) || { label: option, value: option };
					return (
						<Chip
							variant="outlined"
							label={opt.label}
							size="small"
							{...getTagProps({ index })}
							key={index}
							sx={{
								backgroundColor: opt.color ? `${opt.color}20` : undefined,
								borderColor: opt.color || undefined
							}}
						/>
					);
				}) : undefined
			}
			renderInput={(params) => (
				<TextField
					{...params}
					label={label}
					placeholder={placeholder}
					size="small"
					variant="outlined"
				/>
			)}
		/>
	);
}






















